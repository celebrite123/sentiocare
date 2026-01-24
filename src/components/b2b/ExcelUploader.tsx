import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ParsedPatient {
  patient_name: string;
  mobile_number: string;
  discharge_date: string;
  ward?: string;
  doctor_name?: string;
  diagnosis?: string;
  medicine_list?: string;
  follow_up_date?: string;
  red_flag_symptoms?: string;
  isValid: boolean;
  errors: string[];
}

export interface UploadResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  errors: { row: number; message: string }[];
}

interface ExcelUploaderProps {
  onUpload: (patients: ParsedPatient[]) => Promise<UploadResult>;
}

export const ExcelUploader = ({ onUpload }: ExcelUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedPatient[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const normalizeHeader = (header: string): string => {
    return header.toLowerCase().replace(/[\s_-]+/g, "");
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Try different date formats
    const trimmed = dateStr.trim();
    
    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
    
    // YYYY-MM-DD (already ISO format)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }
    
    // Try native Date parsing as fallback
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  };

  const validateMobileNumber = (phone: string): { valid: boolean; normalized: string } => {
    if (!phone) return { valid: false, normalized: "" };
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");
    
    // Extract last 10 digits (Indian mobile number)
    if (digits.length >= 10) {
      const last10 = digits.slice(-10);
      // Indian mobile numbers start with 6-9
      if (/^[6-9]/.test(last10)) {
        return { valid: true, normalized: last10 };
      }
    }
    
    return { valid: false, normalized: digits.slice(-10) };
  };

  const parseCSV = (text: string): ParsedPatient[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('File must have at least a header row and one data row');
    }

    // Parse headers with proper CSV handling (handle quoted fields)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(normalizeHeader);
    
    // Map common header variations
    const headerMap: Record<string, string[]> = {
      patientname: ['patientname', 'name', 'fullname', 'patient'],
      mobilenumber: ['mobilenumber', 'mobile', 'phone', 'phonenumber', 'contact', 'cell'],
      dischargedate: ['dischargedate', 'date', 'dateofdicharge', 'dod'],
      ward: ['ward', 'wardname', 'department', 'dept'],
      doctorname: ['doctorname', 'doctor', 'physician', 'treatingdoctor', 'consultantname'],
      diagnosis: ['diagnosis', 'condition', 'disease', 'primarydiagnosis'],
      medicinelist: ['medicinelist', 'medicines', 'medication', 'medications', 'drugs', 'prescribedmedicines'],
      followupdate: ['followupdate', 'followup', 'nextvisit', 'nextappointment', 'revisitdate'],
      redflagsymptoms: ['redflagsymptoms', 'symptoms', 'warningsymptoms', 'dangersigns', 'redflag'],
    };

    const findHeaderIndex = (key: string): number => {
      const variations = headerMap[key] || [key];
      for (const variation of variations) {
        const idx = headers.findIndex(h => h.includes(variation) || variation.includes(h));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const patientNameIdx = findHeaderIndex('patientname');
    const mobileIdx = findHeaderIndex('mobilenumber');
    const dischargeDateIdx = findHeaderIndex('dischargedate');

    if (patientNameIdx === -1 || mobileIdx === -1 || dischargeDateIdx === -1) {
      const missing = [];
      if (patientNameIdx === -1) missing.push('Patient Name');
      if (mobileIdx === -1) missing.push('Mobile Number');
      if (dischargeDateIdx === -1) missing.push('Discharge Date');
      throw new Error(`Missing required columns: ${missing.join(', ')}`);
    }

    const patients: ParsedPatient[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.every(v => !v.trim())) continue; // Skip empty rows

      const errors: string[] = [];
      
      const patientName = values[patientNameIdx]?.trim() || '';
      const rawMobile = values[mobileIdx]?.trim() || '';
      const rawDischargeDate = values[dischargeDateIdx]?.trim() || '';

      // Validate patient name
      if (!patientName || patientName.length < 2) {
        errors.push('Invalid patient name');
      }

      // Validate and normalize mobile number
      const { valid: mobileValid, normalized: mobileNumber } = validateMobileNumber(rawMobile);
      if (!mobileValid) {
        errors.push('Invalid mobile number (must be 10 digits starting with 6-9)');
      }

      // Validate and parse discharge date
      const dischargeDate = parseDate(rawDischargeDate);
      if (!dischargeDate) {
        errors.push('Invalid discharge date (use DD/MM/YYYY or YYYY-MM-DD)');
      }

      // Parse optional fields
      const wardIdx = findHeaderIndex('ward');
      const doctorIdx = findHeaderIndex('doctorname');
      const diagnosisIdx = findHeaderIndex('diagnosis');
      const medicineIdx = findHeaderIndex('medicinelist');
      const followupIdx = findHeaderIndex('followupdate');
      const symptomsIdx = findHeaderIndex('redflagsymptoms');

      const followUpDateRaw = followupIdx !== -1 ? values[followupIdx]?.trim() : '';
      const followUpDate = parseDate(followUpDateRaw);

      patients.push({
        patient_name: patientName,
        mobile_number: mobileNumber,
        discharge_date: dischargeDate || rawDischargeDate,
        ward: wardIdx !== -1 ? values[wardIdx]?.trim() : '',
        doctor_name: doctorIdx !== -1 ? values[doctorIdx]?.trim() : '',
        diagnosis: diagnosisIdx !== -1 ? values[diagnosisIdx]?.trim() : '',
        medicine_list: medicineIdx !== -1 ? values[medicineIdx]?.trim() : '',
        follow_up_date: followUpDate || '',
        red_flag_symptoms: symptomsIdx !== -1 ? values[symptomsIdx]?.trim() : '',
        isValid: errors.length === 0,
        errors,
      });
    }

    return patients;
  };

  const handleFile = async (file: File) => {
    setFile(file);
    setParseErrors([]);
    setParsedData([]);

    try {
      const text = await file.text();
      const patients = parseCSV(text);
      
      if (patients.length === 0) {
        throw new Error('No valid patient data found in file');
      }
      
      setParsedData(patients);
      setStep('preview');
    } catch (error: any) {
      setParseErrors([error.message]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      handleFile(droppedFile);
    } else {
      setParseErrors(['Please upload a CSV or Excel file']);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    const validPatients = parsedData.filter(p => p.isValid);
    if (validPatients.length === 0) {
      setParseErrors(['No valid patients to upload']);
      return;
    }

    setIsUploading(true);
    try {
      const result = await onUpload(validPatients);
      setUploadResult(result);
      setStep('result');
    } catch (error: any) {
      setParseErrors([error.message]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setParseErrors([]);
    setUploadResult(null);
    setStep('upload');
  };

  const downloadTemplate = () => {
    const headers = 'Patient Name,Mobile Number,Discharge Date,Ward,Doctor Name,Diagnosis,Medicine List,Follow Up Date,Red Flag Symptoms';
    const example1 = 'Ramesh Kumar,9876543210,15/01/2026,Ward A,Dr. Sharma,Fever,"Paracetamol 500mg twice daily, Azithromycin 500mg once daily",22/01/2026,"High fever above 102F, Breathing difficulty, Severe headache"';
    const example2 = 'Sunita Devi,8765432109,15/01/2026,ICU,Dr. Patel,Post-surgery,"Cefixime 200mg twice daily, Pantoprazole 40mg morning",29/01/2026,"Wound bleeding, Swelling, Severe pain"';
    const csv = `${headers}\n${example1}\n${example2}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedData.filter(p => p.isValid).length;
  const invalidCount = parsedData.filter(p => !p.isValid).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload Patient Data
        </CardTitle>
        <CardDescription>
          Upload an Excel or CSV file with discharged patient information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">
                Drag & drop your file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <p className="text-xs text-muted-foreground">
                Supported: CSV, Excel (.xlsx, .xls)
              </p>
            </div>

            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {parseErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedData.length} patients found
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="text-sm text-red-600 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    {invalidCount} invalid
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-[300px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Discharge Date</TableHead>
                    <TableHead>Medicines</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 20).map((patient, idx) => (
                    <TableRow
                      key={idx}
                      className={cn(!patient.isValid && "bg-red-50 dark:bg-red-950/20")}
                    >
                      <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                      <TableCell>{patient.patient_name || '-'}</TableCell>
                      <TableCell>{patient.mobile_number || '-'}</TableCell>
                      <TableCell>{patient.discharge_date || '-'}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={patient.medicine_list}>
                        {patient.medicine_list || '-'}
                      </TableCell>
                      <TableCell>
                        {patient.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-xs text-red-600">
                            {patient.errors.join(', ')}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {parsedData.length > 20 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing first 20 of {parsedData.length} patients
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={validCount === 0 || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {validCount} Patients
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && uploadResult && (
          <div className="space-y-4 text-center">
            {uploadResult.success ? (
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
            ) : (
              <AlertTriangle className="h-16 w-16 mx-auto text-yellow-600" />
            )}
            
            <div>
              <h3 className="text-lg font-semibold">
                {uploadResult.success ? 'Upload Complete!' : 'Upload Completed with Errors'}
              </h3>
              <p className="text-muted-foreground">
                {uploadResult.successful} of {uploadResult.total} patients imported successfully
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{uploadResult.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-950/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{uploadResult.successful}</div>
                <div className="text-xs text-muted-foreground">Success</div>
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-950/30 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{uploadResult.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {uploadResult.errors.length > 0 && (
              <Alert variant="destructive" className="text-left">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {uploadResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>Row {err.row}: {err.message}</li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li>...and {uploadResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleReset}>
              Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
