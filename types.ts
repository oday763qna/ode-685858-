export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal extends NutritionalInfo {
  id: string;
  name: string;
  quantity: string;
}

export interface MealSlot {
  id: string;
  title: string;
  meals: Meal[]; // Support multiple food items per slot
  isDefault: boolean;
}

export interface Exercise {
  id:string;
  name: string;
  duration: string;
  setsReps: string;
}

export interface DayData {
  exercises: Exercise[];
  meals: MealSlot[];
}

export interface WeekData {
  [day: string]: DayData;
}

export interface Profile {
  age: number;
  height: number;
  weight: number;
  goal: 'lose' | 'maintain' | 'gain';
}

export enum ModalType {
    NONE,
    ADD_EXERCISE,
    EDIT_EXERCISE,
    ADD_MEAL_ITEM,
    EDIT_MEAL_ITEM
}

export type View = 'meals' | 'exercises' | 'profile' | 'analytics' | 'info' | 'chatbot';