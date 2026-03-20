export const isAttendanceOpen = (status: string) => {
    if (status === 'OPEN') return true;
    if (status === 'CLOSED') return false;
    
    // Default to AUTO logic (8:00 AM to 5:00 PM)
    const now = new Date();
    const hours = now.getHours();
    return hours >= 8 && hours < 17;
};

// Keep for backward compatibility/internal logic if needed
export const isSchoolHours = (status?: string | boolean) => {
    if (typeof status === 'string') return isAttendanceOpen(status);
    if (status === true) return true; // Legacy support
    const now = new Date();
    const hours = now.getHours();
    return hours >= 8 && hours < 17;
};
