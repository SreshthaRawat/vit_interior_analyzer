export type ConfidenceLevel = "low" | "medium" | "high";

export type DetectedObject = {
  name: string;
  estimatedSize: string;
  confidence: ConfidenceLevel;
};

export type AnalysisResult = {
  roomType: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
    floorArea: string;
  };
  detectedObjects: DetectedObject[];
  calibrationUsed: boolean;
  overallConfidence: ConfidenceLevel;
  notes: string;
};
