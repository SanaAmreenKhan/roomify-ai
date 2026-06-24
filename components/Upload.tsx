import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router";
import { CheckCircle2, ImageIcon, UploadIcon } from "lucide-react";
import {
  REDIRECT_DELAY_MS,
  PROGRESS_INTERVAL_MS,
  PROGRESS_STEP,
} from "../lib/constants";

const Upload: React.FC<UploadProps> = ({ onComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isSignedIn } = useOutletContext<AuthContext>();

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!base64 || progress >= 100) return;

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 100;
        }
        return prev + PROGRESS_STEP;
      });
    }, PROGRESS_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [base64, progress]);

  useEffect(() => {
    if (progress === 100 && base64) {
      timeoutRef.current = setTimeout(() => {
        onComplete(base64);
      }, REDIRECT_DELAY_MS);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [progress, base64, onComplete]);

  const validateFile = (file: File): boolean => {
    const isImage = ["image/jpeg", "image/png"].includes(file.type);
    const isUnderLimit = file.size <= 10 * 1024 * 1024; // 10MB

    if (!isImage) {
      alert("Please upload a JPG or PNG file.");
      return false;
    }
    if (!isUnderLimit) {
      alert("File size exceeds 10MB.");
      return false;
    }
    return true;
  };

  const processFile = (file: File) => {
    if (!isSignedIn) return;

    if (!validateFile(file)) return;

    setFile(file);
    setProgress(0);
    setBase64(null);

    const reader = new FileReader();
    reader.onerror = () => {
      alert("Error reading file");
      setFile(null);
    };
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isSignedIn) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isSignedIn && e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (validateFile(e.dataTransfer.files[0])) {
        processFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (validateFile(e.target.files[0])) {
        processFile(e.target.files[0]);
      }
    }
  };

  return (
    <div
      className="upload"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!file ? (
        <div className={`dropzone ${isDragging ? "is-dragging" : ""}`}>
          <input
            type="file"
            className="drop-input"
            accept=".jpg,.jpeg,.png"
            disabled={!isSignedIn}
            onChange={handleChange}
          />

          <div className="drop-content">
            <div className="drop-icon">
              <UploadIcon size={20} />
            </div>
            <p>
              {isSignedIn
                ? "Click to upload or just drag and drop"
                : "Sign in or signup with Puter to upload"}
            </p>

            <p className="help">Supports JPG, PNG, formats up to 10MB.</p>
          </div>
        </div>
      ) : (
        <div className="upload-status">
          <div className="status-content">
            <div className="status-icon">
              {progress === 100 ? (
                <CheckCircle2 className="check" />
              ) : (
                <ImageIcon className="image" />
              )}
            </div>

            <h3>{file.name}</h3>

            <div className="progress">
              <div className="bar" style={{ width: `${progress}%` }} />

              <p className="status-text">
                {progress < 100 ? "Analyzing floor plan..." : "Redirecting..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
