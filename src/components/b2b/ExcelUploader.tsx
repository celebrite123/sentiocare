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
  consent_given: boolean;
  // Caregiver fields
  caregiver_name?: string;
  caregiver_phone?: string;
  caregiver_relation?: string;
  isValid: boolean;
  errors: string[];
  skipped?: boolean;
  skipReason?: string;
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
      consent: ['consent', 'patientconsent', 'agreed', 'optin', 'optedIn', 'permission', 'consentgiven'],
      // Caregiver fields
      caregivername: ['caregivername', 'familycontactname', 'attendantname', 'relativename'],
      caregiverphone: ['caregiverphone', 'familyphone', 'attendantphone', 'relativephone', 'familycontact'],
      caregiverrelation: ['caregiverrelation', 'relation', 'relationship', 'attendantrelation'],
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
      const consentIdx = findHeaderIndex('consent');
      // Caregiver indices
      const caregiverNameIdx = findHeaderIndex('caregivername');
      const caregiverPhoneIdx = findHeaderIndex('caregiverphone');
      const caregiverRelationIdx = findHeaderIndex('caregiverrelation');

      const followUpDateRaw = followupIdx !== -1 ? values[followupIdx]?.trim() : '';
      const followUpDate = parseDate(followUpDateRaw);

      // Parse consent - default to true if column not present
      let consentGiven = true;
      let skipped = false;
      let skipReason = '';
      
      if (consentIdx !== -1) {
        const consentValue = values[consentIdx]?.trim().toLowerCase();
        // Check for explicit NO consent
        if (['no', 'n', '0', 'false', 'refused', 'declined'].includes(consentValue)) {
          consentGiven = false;
          skipped = true;
          skipReason = 'No consent';
        } else if (!consentValue || consentValue === '') {
          // Empty consent field - skip with warning
          consentGiven = false;
          skipped = true;
          skipReason = 'Consent not specified';
        }
      }

      // Parse caregiver fields
      const caregiverName = caregiverNameIdx !== -1 ? values[caregiverNameIdx]?.trim() : '';
      const caregiverPhone = caregiverPhoneIdx !== -1 ? values[caregiverPhoneIdx]?.trim().replace(/\D/g, '').slice(-10) : '';
      const caregiverRelation = caregiverRelationIdx !== -1 ? normalizeRelation(values[caregiverRelationIdx]?.trim()) : '';

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
        consent_given: consentGiven,
        caregiver_name: caregiverName || undefined,
        caregiver_phone: caregiverPhone || undefined,
        caregiver_relation: caregiverRelation || undefined,
        isValid: errors.length === 0 && !skipped,
        errors,
        skipped,
        skipReason,
      });
    }

    return patients;
  };

  // Helper to normalize caregiver relation
  const normalizeRelation = (relation: string): string => {
    if (!relation) return '';
    const lower = relation.toLowerCase().trim();
    const relationMap: Record<string, string> = {
      'wife': 'spouse', 'husband': 'spouse', 'spouse': 'spouse',
      'son': 'son', 'beta': 'son',
      'daughter': 'daughter', 'beti': 'daughter',
      'daughter-in-law': 'daughter_in_law', 'bahu': 'daughter_in_law',
      'son-in-law': 'son_in_law', 'damaad': 'son_in_law',
      'father': 'parent', 'mother': 'parent', 'parent': 'parent',
      'brother': 'sibling', 'sister': 'sibling', 'sibling': 'sibling',
    };
    return relationMap[lower] || 'other';
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
    const headers = 'Patient Name,Mobile Number,Discharge Date,Ward,Doctor Name,Diagnosis,Medicine List,Follow Up Date,Red Flag Symptoms,Consent,Caregiver Name,Caregiver Phone,Caregiver Relation';
    const example1 = 'Ramesh Kumar,9876543210,15/01/2026,Ward A,Dr. Sharma,Fever,"Paracetamol 500mg twice daily, Azithromycin 500mg once daily",22/01/2026,"High fever above 102F, Breathing difficulty, Severe headache",Yes,Priya Kumar,9876543211,daughter';
    const example2 = 'Sunita Devi,8765432109,15/01/2026,ICU,Dr. Patel,Post-surgery,"Cefixime 200mg twice daily, Pantoprazole 40mg morning",29/01/2026,"Wound bleeding, Swelling, Severe pain",Yes,Ravi Sharma,8765432108,son';
    const example3 = 'Priya Sharma,7654321098,15/01/2026,General,Dr. Gupta,Delivery,"Iron tablets twice daily",22/01/2026,"Heavy bleeding, High fever",No,,,';
    const csv = `${headers}\n${example1}\n${example2}\n${example3}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedData.filter(p => p.isValid && !p.skipped).length;
  const invalidCount = parsedData.filter(p => !p.isValid && !p.skipped).length;
  const skippedCount = parsedData.filter(p => p.skipped).length;

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
          Upload Patient Data
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Upload an Excel or CSV file with patient information
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg font-medium mb-1">
                Drag & drop your file here
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
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
                <Button variant="outline" size="sm" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-xs sm:text-sm">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Supported: CSV, Excel
              </p>
            </div>

            {parseErrors.length > 0 && (
              <Alert variant="destructive" className="text-xs sm:text-sm">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-medium text-sm sm:text-base truncate">{file?.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {parsedData.length} patients found
                </p>
              </div>
              <div className="flex gap-2 flex-wrap text-xs sm:text-sm">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="text-red-600 flex items-center gap-1">
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    {invalidCount} invalid
                  </span>
                )}
                {skippedCount > 0 && (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                    {skippedCount} skipped
                  </span>
                )}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-2 max-h-[300px] overflow-y-auto">
              {parsedData.slice(0, 20).map((patient, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 border rounded-lg text-sm",
                    !patient.isValid && "bg-red-50 dark:bg-red-950/20 border-red-200"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{patient.patient_name || '-'}</p>
                      <p className="text-xs text-muted-foreground">{patient.mobile_number}</p>
                    </div>
                    {patient.skipped ? (
                      <span className="text-[10px] text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded shrink-0">
                        {patient.skipReason}
                      </span>
                    ) : patient.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                    )}
                  </div>
                  {!patient.isValid && !patient.skipped && (
                    <p className="text-[10px] text-red-600 mt-1 truncate">{patient.errors.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block max-h-[300px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Discharge</TableHead>
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
                      <TableCell className="text-sm">{patient.patient_name || '-'}</TableCell>
                      <TableCell className="text-sm">{patient.mobile_number || '-'}</TableCell>
                      <TableCell className="text-sm">{patient.discharge_date || '-'}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm" title={patient.medicine_list}>
                        {patient.medicine_list || '-'}
                      </TableCell>
                      <TableCell>
                        {patient.skipped ? (
                          <span className="text-xs text-yellow-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {patient.skipReason}
                          </span>
                        ) : patient.isValid ? (
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
              <p className="text-xs sm:text-sm text-muted-foreground text-center">
                Showing first 20 of {parsedData.length} patients
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={validCount === 0 || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">Uploading...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1 sm:mr-2" />
                    Upload {validCount}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && uploadResult && (
          <div className="space-y-4 text-center">
            {uploadResult.success ? (
              <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-green-600" />
            ) : (
              <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-yellow-600" />
            )}
            
            <div>
              <h3 className="text-base sm:text-lg font-semibold">
                {uploadResult.success ? 'Upload Complete!' : 'Completed with Errors'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {uploadResult.successful} of {uploadResult.total} patients imported
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto">
              <div className="p-2 sm:p-4 bg-muted rounded-lg">
                <div className="text-xl sm:text-2xl font-bold">{uploadResult.total}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-2 sm:p-4 bg-green-100 dark:bg-green-950/30 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{uploadResult.successful}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Success</div>
              </div>
              <div className="p-2 sm:p-4 bg-red-100 dark:bg-red-950/30 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-red-600">{uploadResult.failed}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {uploadResult.errors.length > 0 && (
              <Alert variant="destructive" className="text-left text-xs sm:text-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {uploadResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>Row {err.row}: {err.message}</li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li>...and {uploadResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button size="sm" onClick={handleReset}>
              Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
