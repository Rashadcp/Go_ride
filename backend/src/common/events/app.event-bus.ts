import { EventEmitter } from "events";

class AppEventBus extends EventEmitter {}

export const appEventBus = new AppEventBus();
