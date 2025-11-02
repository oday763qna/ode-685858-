import React, { useState, useEffect } from 'react';
import { Exercise, Meal, NutritionalInfo } from '../types';
import { fetchNutritionWithGemini } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FormInput: React.FC<FormInputProps> = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input
      {...props}
      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
    />
  </div>
);

const FormButton: React.FC<{ children: React.ReactNode, onClick?: () => void, type?: 'button' | 'submit' | 'reset', disabled?: boolean, className?: string }> = ({ children, disabled, className = '', ...props }) => (
    <button
        {...props}
        disabled={disabled}
        className={`w-full px-4 py-3 text-white font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${className || 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}
    >
        {children}
    </button>
);


interface ExerciseFormProps {
  onSubmit: (exercise: Omit<Exercise, 'id'>) => void;
  exerciseToEdit?: Exercise | null;
}

export const ExerciseForm: React.FC<ExerciseFormProps> = ({ onSubmit, exerciseToEdit }) => {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [setsReps, setSetsReps] = useState('');

  useEffect(() => {
    if (exerciseToEdit) {
      setName(exerciseToEdit.name);
      setDuration(exerciseToEdit.duration);
      setSetsReps(exerciseToEdit.setsReps);
    }
  }, [exerciseToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSubmit({ name, duration, setsReps });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput label="اسم التمرين" value={name} onChange={(e) => setName(e.target.value)} required />
      <FormInput label="المدة (مثال: 30 دقيقة)" value={duration} onChange={(e) => setDuration(e.target.value)} />
      <FormInput label="المجموعات/التكرارات (مثال: 3x12)" value={setsReps} onChange={(e) => setSetsReps(e.target.value)} />
      <FormButton type="submit">{exerciseToEdit ? 'تحديث التمرين' : 'إضافة تمرين'}</FormButton>
    </form>
  );
};

interface MealFormProps {
  onSubmit: (meal: Omit<Meal, 'id'>) => void;
  mealToEdit?: Meal | null;
}

export const MealForm: React.FC<MealFormProps> = ({ onSubmit, mealToEdit }) => {
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [manualEntry, setManualEntry] = useState(false);
    const [nutrition, setNutrition] = useState<NutritionalInfo>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (mealToEdit) {
            setName(mealToEdit.name);
            setQuantity(mealToEdit.quantity);
            setNutrition({ calories: mealToEdit.calories, protein: mealToEdit.protein, carbs: mealToEdit.carbs, fat: mealToEdit.fat });
        }
    }, [mealToEdit]);

    const handleFetchNutrition = async () => {
        if (!name || !quantity) return;
        setIsLoading(true);
        setError(null);
        try {
            const fetchedNutrition = await fetchNutritionWithGemini(name, quantity);
            if (fetchedNutrition) {
                onSubmit({ name, quantity, ...fetchedNutrition });
            } else {
                setError("لم نجد بيانات تلقائية عبر Gemini. الرجاء إدخال القيم يدويًا.");
                setManualEntry(true);
            }
        } catch (err) {
            setError("حدث خطأ أثناء البحث عبر Gemini. الرجاء إدخال القيم يدويًا.");
            setManualEntry(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ name, quantity, ...nutrition });
    };
    
    const handleNutrientChange = (field: keyof NutritionalInfo, value: string) => {
        setNutrition(prev => ({...prev, [field]: parseFloat(value) || 0 }));
    }

    if (isLoading) {
        return <LoadingSpinner message="جاري البحث عن المعلومات الغذائية عبر Gemini..." />;
    }
    
    if(manualEntry) {
        return (
             <form onSubmit={handleManualSubmit} className="space-y-4">
                {error && <p className="text-yellow-600 dark:text-yellow-400 text-sm bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-lg">{error}</p>}
                <p className="text-lg font-semibold">{name} ({quantity})</p>
                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="السعرات الحرارية" type="number" value={nutrition.calories} onChange={(e) => handleNutrientChange('calories', e.target.value)} required />
                    <FormInput label="البروتين (غ)" type="number" value={nutrition.protein} onChange={(e) => handleNutrientChange('protein', e.target.value)} required />
                    <FormInput label="الكربوهيدرات (غ)" type="number" value={nutrition.carbs} onChange={(e) => handleNutrientChange('carbs', e.target.value)} required />
                    <FormInput label="الدهون (غ)" type="number" value={nutrition.fat} onChange={(e) => handleNutrientChange('fat', e.target.value)} required />
                </div>
                <FormButton type="submit">حفظ البيانات</FormButton>
            </form>
        )
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleFetchNutrition(); }} className="space-y-4">
            <FormInput label="اسم الطعام" value={name} onChange={(e) => setName(e.target.value)} required />
            <FormInput label="الكمية (مثال: 100 جرام، 1 كوب)" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <FormButton type="submit" disabled={isLoading}>{mealToEdit ? 'تحديث والبحث' : 'إضافة وبحث تلقائي'}</FormButton>
            <FormButton type="button" onClick={() => setManualEntry(true)} className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500">
                أو إدخال يدوي
            </FormButton>
        </form>
    );
};