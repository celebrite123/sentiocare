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

interface ParsedPatient {
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

interface UploadResult {
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

  const parseCSV = (text: string): ParsedPatient[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('File must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['patient name', 'mobile number', 'discharge date'];
    const missingHeaders = requiredHeaders.filter(
      h => !headers.some(header => header.includes(h.replace(' ', '')))
    );

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const patients: ParsedPatient[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const rowData: Record<string, string> = {};
      
      headers.forEach((header, idx) => {
        rowData[header] = values[idx] || '';
      });

      const errors: string[] = [];
      const patientName = rowData['patientname'] || rowData['patient name'] || rowData['name'] || '';
      const mobileNumber = rowData['mobilenumber'] || rowData['mobile number'] || rowData['phone'] || rowData['mobile'] || '';
      const dischargeDate = rowData['dischargedate'] || rowData['discharge date'] || rowData['date'] || '';

      if (!patientName) errors.push('Missing patient name');
      if (!mobileNumber || !/^\d{10}$/.test(mobileNumber.replace(/[^0-9]/g, '').slice(-10))) {
        errors.push('Invalid mobile number');
      }
      if (!dischargeDate) errors.push('Missing discharge date');

      patients.push({
        patient_name: patientName,
        mobile_number: mobileNumber.replace(/[^0-9]/g, '').slice(-10),
        discharge_date: dischargeDate,
        ward: rowData['ward'] || '',
        doctor_name: rowData['doctorname'] || rowData['doctor name'] || rowData['doctor'] || '',
        diagnosis: rowData['diagnosis'] || '',
        medicine_list: rowData['medicinelist'] || rowData['medicine list'] || rowData['medicines'] || '',
        follow_up_date: rowData['followupdate'] || rowData['follow up date'] || rowData['followup'] || '',
        red_flag_symptoms: rowData['redflagsymptoms'] || rowData['red flag symptoms'] || rowData['symptoms'] || '',
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
    const example = 'John Doe,9876543210,2024-01-15,Ward A,Dr. Smith,Fever,"Paracetamol 500mg twice daily",2024-01-22,"High fever, breathing difficulty"';
    const csv = `${headers}\n${example}`;
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
