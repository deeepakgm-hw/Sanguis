import { Schema, model, Document, Types } from "mongoose";

export interface IUploadedFile extends Document {
  owner: Types.ObjectId;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  publicId: string; // cloudinary id, needed for deletion
  scanStatus: "pending" | "clean" | "infected" | "skipped";
  createdAt: Date;
}

const uploadedFileSchema = new Schema<IUploadedFile>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    scanStatus: { type: String, enum: ["pending", "clean", "infected", "skipped"], default: "pending" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const UploadedFile = model<IUploadedFile>("UploadedFile", uploadedFileSchema);
