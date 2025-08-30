import { model, Schema } from 'mongoose';

const NotificationSchema = new Schema(
  {
    title: {
      type: String,
      required: false,
    },
    text: {
      type: String,
      reauired: true,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    type: {
      type: String,
      enum: ['message', 'alert', 'news', 'system'],
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

export default model('Notification', NotificationSchema);
