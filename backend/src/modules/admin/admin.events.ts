import { io } from "../../config/socket";
import { appEventBus } from "../../common/events/app.event-bus";
import { createNotification } from "../notification/notification.controller";
import { sendDriverApprovalEmail } from "../../config/mail";

export const ADMIN_EVENTS = {
  DRIVER_APPROVAL_STATUS_CHANGED: "admin:driver-approval-status-changed",
} as const;

export type DriverApprovalStatus = "APPROVED" | "REJECTED";

export interface DriverApprovalStatusChangedPayload {
  userId: string;
  vehicleId: string;
  driverName: string;
  email?: string;
  status: DriverApprovalStatus;
}

let adminEventHandlersRegistered = false;

const getDriverDecisionContent = (status: DriverApprovalStatus) => {
  if (status === "APPROVED") {
    return {
      title: "Driver Profile Approved",
      message:
        "Your driver profile has been approved. You can now go online and start accepting rides.",
    };
  }

  return {
    title: "Driver Profile Review Update",
    message:
      "Your driver profile review has been completed. Please check your documents and contact support if you need help.",
  };
};

export const emitDriverApprovalStatusChanged = (
  payload: DriverApprovalStatusChangedPayload
) => {
  appEventBus.emit(ADMIN_EVENTS.DRIVER_APPROVAL_STATUS_CHANGED, payload);
};

export const registerAdminEventHandlers = () => {
  if (adminEventHandlersRegistered) {
    return;
  }

  adminEventHandlersRegistered = true;

  appEventBus.on(
    ADMIN_EVENTS.DRIVER_APPROVAL_STATUS_CHANGED,
    async (payload: DriverApprovalStatusChangedPayload) => {
      const { title, message } = getDriverDecisionContent(payload.status);

      try {
        await createNotification(
          payload.userId,
          title,
          message,
          "SYSTEM"
        );

        io?.to(`user:${payload.userId}`).emit("system:alert", {
          title,
          message,
          type: "SYSTEM",
        });

        if (payload.status === "APPROVED" && payload.email) {
          await sendDriverApprovalEmail(payload.email, payload.driverName);
        }
      } catch (error) {
        console.error("Driver approval event handler failed:", error);
      }
    }
  );
};
