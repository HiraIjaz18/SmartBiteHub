// utils/timer.js
export const calculateTimer = () => {
    const startTime = new Date();
    startTime.setHours(8, 15, 0, 0); // Timer starts at 8:15 AM
    const endTime = new Date();
    endTime.setHours(15, 45, 0, 0); // Timer ends at 3:45 PM
  
    const now = new Date();
  
    if (now < startTime || now > endTime) {
      return { isActive: false, remainingTime: null };
    }
  
    const elapsedTime = Math.floor((now - startTime) / 1000); // Elapsed time in seconds
    const intervalLength = 45 * 60; // 45 minutes in seconds
    const currentInterval = Math.floor(elapsedTime / intervalLength);
    const intervalStartTime = startTime.getTime() + currentInterval * intervalLength * 1000;
  
    const remainingTime = intervalLength - Math.floor((now - intervalStartTime) / 1000);
  
    return {
      isActive: true,
      remainingTime, // Remaining time in seconds
      nextIntervalTime: new Date(intervalStartTime + intervalLength * 1000),
    };
  };
  