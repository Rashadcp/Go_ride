export interface Vehicle {
    _id: string;
    numberPlate: string;
    vehicleModel: string;
    vehicleType: string;
    rc: string;
    vehiclePhotos: string[];
    status: string;
}

export interface Driver {
    _id: string;
    name: string;
    email: string;
    status: string;
    role: string;
    profilePhoto?: string;
    license?: string;
    aadhaar?: string;
    isBlocked?: boolean;
    isSuspicious?: boolean;
    reportCount?: number;
    vehicle?: Vehicle;
}
