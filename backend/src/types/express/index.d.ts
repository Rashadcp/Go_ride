declare namespace Express {
  export interface Request {
    files?: {
      [fieldname: string]: Express.Multer.File[];
    };
  }
}