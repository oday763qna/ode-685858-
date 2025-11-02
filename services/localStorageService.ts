import { WeekData, Profile } from '../types';
import { DAYS_OF_WEEK, DEFAULT_MEAL_SLOTS } from '../constants';

const WEEK_DATA_KEY = 'fitnessPlannerWeekData_v2'; // New key for new data structure
const PROFILE_KEY = 'fitnessPlannerProfile';
const GENERATED_PLAN_KEY = 'fitnessPlannerGeneratedPlan';


// دالة لإنشاء هيكل بيانات أسبوعي فارغ مع الخانات الافتراضية للوجبات
const createEmptyWeekData = (): WeekData => {
  return DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = { 
      exercises: [], 
      meals: DEFAULT_MEAL_SLOTS.map(title => ({
          id: `${day}-${title}-${Date.now()}-${Math.random()}`,
          title,
          meals: [], // Updated structure
          isDefault: true,
      }))
    };
    return acc;
  }, {} as WeekData);
};


export const loadWeekData = (): WeekData => {
  try {
    const savedData = localStorage.getItem(WEEK_DATA_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      // A simple validation to ensure the data structure is correct
      if (parsed[DAYS_OF_WEEK[0]]?.meals?.[0]?.meals && Array.isArray(parsed[DAYS_OF_WEEK[0]].meals[0].meals)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load week data from localStorage", error);
  }
  
  // إرجاع هيكل فارغ مع خانات الوجبات الافتراضية إذا لم يتم العثور على بيانات محفوظة أو كانت تالفة
  return createEmptyWeekData();
};

export const saveWeekData = (data: WeekData) => {
  try {
    localStorage.setItem(WEEK_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save week data to localStorage", error);
  }
};

// دالة لحذف جميع بيانات الأسبوع والبدء من جديد
export const resetWeekData = (): WeekData => {
    try {
        localStorage.removeItem(WEEK_DATA_KEY);
    } catch (error) {
        console.error("Failed to remove week data from localStorage", error);
    }
    return createEmptyWeekData();
}


export const loadProfileData = (): Profile => {
    try {
        const savedData = localStorage.getItem(PROFILE_KEY);
        if (savedData) {
            return JSON.parse(savedData);
        }
    } catch (error) {
        console.error("Failed to load profile data from localStorage", error);
    }
    // ملف شخصي افتراضي
    return { age: 25, height: 175, weight: 70, goal: 'maintain' };
};

export const saveProfileData = (data: Profile) => {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Failed to save profile data to localStorage", error);
    }
};

// --- Generated Plan Persistence ---

export const saveGeneratedPlan = (plan: any) => {
    try {
        if (plan) {
            localStorage.setItem(GENERATED_PLAN_KEY, JSON.stringify(plan));
        } else {
            localStorage.removeItem(GENERATED_PLAN_KEY);
        }
    } catch (error) {
        console.error("Failed to save generated plan to localStorage", error);
    }
};

export const loadGeneratedPlan = (): any | null => {
    try {
        const savedData = localStorage.getItem(GENERATED_PLAN_KEY);
        return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
        console.error("Failed to load generated plan from localStorage", error);
        return null;
    }
};