import { model, Schema } from 'mongoose';
import { INotification } from '../types/types';

const NotificationSchema = new Schema<INotification>(
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
