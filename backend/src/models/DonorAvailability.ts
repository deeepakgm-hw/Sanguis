import { Schema, model, Document, Types } from 'mongoose';

export interface IUnavailablePeriod {
  _id: Types.ObjectId;
  from: Date;
  to: Date;
  reason?: string;
}

export interface IDonorAvailability extends Document {
  donor: Types.ObjectId;
  unavailablePeriods: IUnavailablePeriod[];
}

const unavailablePeriodSchema = new Schema<IUnavailablePeriod>(
  {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    reason: { type: String },
  },
  { timestamps: false, _id: true }
);

const donorAvailabilitySchema = new Schema<IDonorAvailability>(
  {
    donor: {
      type: Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
      unique: true,
      index: true,
    },
    unavailablePeriods: { type: [unavailablePeriodSchema], default: [] },
  },
  { timestamps: true }
);

export const DonorAvailability = model<IDonorAvailability>(
  'DonorAvailability',
  donorAvailabilitySchema
);
