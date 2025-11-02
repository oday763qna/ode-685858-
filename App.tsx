import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WeekData, DayData, Exercise, Meal, ModalType, View, Profile, MealSlot, NutritionalInfo } from './types';
import { DAYS_OF_WEEK } from './constants';
import { loadWeekData, saveWeekData, loadProfileData, saveProfileData, resetWeekData, saveGeneratedPlan, loadGeneratedPlan } from './services/localStorageService';
import { generateMealPlan } from './services/geminiService';
import { Modal } from './components/Modal';
import { ExerciseForm, MealForm } from './components/DataForms';
import { LoadingSpinner } from './components/LoadingSpinner';
import { GoogleGenAI, Chat } from "@google/genai";


// --- Confirmation Modal Component ---
const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: string;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'تأكيد', confirmColor = 'bg-red-600 hover:bg-red-700' }) => {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6 text-right">
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-semibold"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-6 py-2 rounded-lg text-white transition-colors font-semibold ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};


// Main App Component - Acts as a router
const App: React.FC = () => {
    const [view, setView] = useState<View>('profile');
    const [weekData, setWeekData] = useState<WeekData>(loadWeekData);
    const [profile, setProfile] = useState<Profile>(loadProfileData);

    useEffect(() => {
        saveWeekData(weekData);
    }, [weekData]);

    useEffect(() => {
        saveProfileData(profile);
    }, [profile]);

    const updateWeekData = (newWeekData: WeekData) => {
        setWeekData(newWeekData);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
            <Header />
            <Navbar activeView={view} setView={setView} />
            <main className="mt-6">
                {view === 'meals' && <MealPlannerView weekData={weekData} setWeekData={setWeekData} />}
                {view === 'exercises' && <ExercisePlannerView weekData={weekData} setWeekData={setWeekData} />}
                {view === 'profile' && <ProfileView profile={profile} setProfile={setProfile} updateWeekData={updateWeekData} />}
                {view === 'analytics' && <AnalyticsView weekData={weekData} />}
                {view === 'info' && <InfoView />}
                {view === 'chatbot' && <ChatbotView />}
            </main>
            <Footer />
        </div>
    );
};

const Header: React.FC = () => (
    <header className="text-center mb-6 no-print">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-green-600 dark:text-green-400">ode منظم اللياقة والتغذية</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">خطط لتمارينك ووجباتك بسهولة ودقة</p>
    </header>
);

const Navbar: React.FC<{ activeView: View; setView: (view: View) => void }> = ({ activeView, setView }) => {
    const navItems: { key: View; label: string }[] = [
        { key: 'profile', label: 'الملف الشخصي' },
        { key: 'meals', label: 'الوجبات' },
        { key: 'exercises', label: 'التمارين' },
        { key: 'chatbot', label: 'المساعد الذكي' },
        { key: 'analytics', label: 'التحليلات' },
        { key: 'info', label: 'معلومات' },
    ];
    
    return (
        <nav className="bg-white dark:bg-gray-800/50 shadow-md rounded-lg p-2 flex flex-wrap justify-center items-center gap-2 md:gap-4 no-print">
            {navItems.map(item => (
                <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    className={`px-3 py-2 md:px-5 text-sm md:text-base font-semibold rounded-md transition-colors duration-300 ${activeView === item.key 
                        ? 'bg-green-600 text-white shadow' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/50'}`}
                >
                    {item.label}
                </button>
            ))}
        </nav>
    );
};


// --- Exercise Planner View ---
const ExercisePlannerView: React.FC<{ weekData: WeekData; setWeekData: React.Dispatch<React.SetStateAction<WeekData>> }> = ({ weekData, setWeekData }) => {
    const [activeModal, setActiveModal] = useState<ModalType>(ModalType.NONE);
    const [selectedDay, setSelectedDay] = useState<string>(DAYS_OF_WEEK[0]);
    const [itemToEdit, setItemToEdit] = useState<Exercise | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ day: string; itemId: string } | null>(null);

    const handleOpenModal = (modalType: ModalType, day: string, item?: Exercise) => {
        setSelectedDay(day);
        setActiveModal(modalType);
        setItemToEdit(item || null);
    };

    const handleCloseModal = () => {
        setActiveModal(ModalType.NONE);
        setItemToEdit(null);
    };

    const handleAddOrUpdateExercise = (exerciseData: Omit<Exercise, 'id'>) => {
        setWeekData(prev => {
            const newWeekData = { ...prev };
            const dayData = { ...newWeekData[selectedDay] };
            if (activeModal === ModalType.EDIT_EXERCISE && itemToEdit) {
                dayData.exercises = dayData.exercises.map(ex => ex.id === itemToEdit.id ? { ...ex, ...exerciseData } : ex);
            } else {
                dayData.exercises = [...dayData.exercises, { ...exerciseData, id: Date.now().toString() }];
            }
            newWeekData[selectedDay] = dayData;
            return newWeekData;
        });
        handleCloseModal();
    };

    const handleConfirmDeleteExercise = () => {
        if (!itemToDelete) return;
        const { day, itemId } = itemToDelete;
        setWeekData(prev => ({
            ...prev,
            [day]: { ...prev[day], exercises: prev[day].exercises.filter(ex => ex.id !== itemId) }
        }));
        setItemToDelete(null);
    };

    return (
        <>
            <DaySelector selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
            <div className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-xl shadow-lg animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">🏋️ التمارين لـ {selectedDay}</h3>
                    <button onClick={() => handleOpenModal(ModalType.ADD_EXERCISE, selectedDay)} className="no-print text-sm bg-blue-500 text-white px-3 py-1.5 rounded-full hover:bg-blue-600 transition-colors font-semibold">+ إضافة</button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="p-3 font-semibold text-sm">التمرين</th>
                                <th className="p-3 font-semibold text-sm">المدة</th>
                                <th className="p-3 font-semibold text-sm">المجموعات/التكرارات</th>
                                <th className="p-3 font-semibold text-sm no-print">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {weekData[selectedDay].exercises.length > 0 ? weekData[selectedDay].exercises.map(ex => (
                                <tr key={ex.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                    <td className="p-3 font-medium">{ex.name}</td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">{ex.duration || '-'}</td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">{ex.setsReps || '-'}</td>
                                    <td className="p-3 no-print flex items-center">
                                        <button onClick={() => handleOpenModal(ModalType.EDIT_EXERCISE, selectedDay, ex)} className="text-blue-500 hover:underline text-sm ml-4">تعديل</button>
                                        <button onClick={() => setItemToDelete({ day: selectedDay, itemId: ex.id })} className="text-red-500 hover:underline text-sm">حذف</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4}><EmptyState>لم تتم إضافة تمارين</EmptyState></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={activeModal === ModalType.ADD_EXERCISE || activeModal === ModalType.EDIT_EXERCISE} onClose={handleCloseModal} title={activeModal === ModalType.EDIT_EXERCISE ? "تعديل التمرين" : "إضافة تمرين جديد"}>
                <ExerciseForm onSubmit={handleAddOrUpdateExercise} exerciseToEdit={activeModal === ModalType.EDIT_EXERCISE ? itemToEdit : null} />
            </Modal>
            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleConfirmDeleteExercise}
                title="تأكيد حذف التمرين"
                message="هل أنت متأكد من حذف هذا التمرين؟ لا يمكن التراجع عن هذا الإجراء."
                confirmText="نعم، احذف"
            />
        </>
    )
}

// --- Meal Planner View ---
const MealPlannerView: React.FC<{ weekData: WeekData; setWeekData: React.Dispatch<React.SetStateAction<WeekData>> }> = ({ weekData, setWeekData }) => {
    const [selectedDay, setSelectedDay] = useState<string>(DAYS_OF_WEEK[0]);
    const [activeModal, setActiveModal] = useState<ModalType>(ModalType.NONE);
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
    const [itemToEdit, setItemToEdit] = useState<Meal | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ slotId: string; itemId: string } | null>(null);
    const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);

    const handleOpenModal = (modalType: ModalType, slotId: string, item?: Meal) => {
        setActiveModal(modalType);
        setSelectedSlotId(slotId);
        setItemToEdit(item || null);
    };

    const handleCloseModal = () => {
        setActiveModal(ModalType.NONE);
        setSelectedSlotId(null);
        setItemToEdit(null);
    };

    const handleAddOrUpdateMealItem = (mealData: Omit<Meal, 'id'>) => {
        if (!selectedSlotId) return;
        setWeekData(prev => {
            const dayData = prev[selectedDay];
            const newSlots = dayData.meals.map(slot => {
                if (slot.id === selectedSlotId) {
                    let newMeals;
                    if (activeModal === ModalType.EDIT_MEAL_ITEM && itemToEdit) {
                        newMeals = slot.meals.map(m => m.id === itemToEdit.id ? { ...m, ...mealData } : m);
                    } else {
                        newMeals = [...slot.meals, { ...mealData, id: Date.now().toString() }];
                    }
                    return { ...slot, meals: newMeals };
                }
                return slot;
            });
            return { ...prev, [selectedDay]: { ...dayData, meals: newSlots } };
        });
        handleCloseModal();
    };

    const handleConfirmDeleteMealItem = () => {
        if (!itemToDelete) return;
        const { slotId, itemId } = itemToDelete;
        setWeekData(prev => {
            const dayData = prev[selectedDay];
            const newSlots = dayData.meals.map(slot => {
                if (slot.id === slotId) {
                    return { ...slot, meals: slot.meals.filter(m => m.id !== itemId) };
                }
                return slot;
            });
            return { ...prev, [selectedDay]: { ...dayData, meals: newSlots } };
        });
    };
    
    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, meal: Meal, day: string, slotId: string) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            mealId: meal.id,
            sourceDay: day,
            sourceSlotId: slotId,
        }));
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            (e.target as HTMLElement).classList.add('dragging-meal');
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).classList.remove('dragging-meal');
    };

    const handleDragOver = (e: React.DragEvent, slotId: string) => {
        e.preventDefault();
        if (slotId !== dragOverSlotId) {
            setDragOverSlotId(slotId);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverSlotId(null);
    };
    
    const handleDrop = (e: React.DragEvent, targetDay: string, targetSlotId: string) => {
        e.preventDefault();
        setDragOverSlotId(null);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            const { mealId, sourceDay, sourceSlotId } = data;

            if (sourceDay === targetDay && sourceSlotId === targetSlotId) return;

            setWeekData(prev => {
                const newWeekData = JSON.parse(JSON.stringify(prev));
                let mealToMove: Meal | undefined;

                const sourceSlot = newWeekData[sourceDay]?.meals.find((s: MealSlot) => s.id === sourceSlotId);
                if (sourceSlot) {
                    const mealIndex = sourceSlot.meals.findIndex((m: Meal) => m.id === mealId);
                    if (mealIndex > -1) {
                        [mealToMove] = sourceSlot.meals.splice(mealIndex, 1);
                    }
                }

                if (!mealToMove) return prev;

                const targetSlot = newWeekData[targetDay]?.meals.find((s: MealSlot) => s.id === targetSlotId);
                if (targetSlot) {
                    targetSlot.meals.push(mealToMove);
                } else {
                    sourceSlot.meals.push(mealToMove); // Revert if target not found
                }

                return newWeekData;
            });
        } catch (error) {
            console.error("Failed to handle drop:", error);
        }
    };

    const dayNutrition = weekData[selectedDay].meals.reduce((acc, slot) => {
        slot.meals.forEach(meal => {
            acc.calories += meal.calories;
            acc.protein += meal.protein;
            acc.carbs += meal.carbs;
            acc.fat += meal.fat;
        });
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return (
        <>
            <DaySelector selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
            <div className="space-y-6 animate-fade-in">
                {weekData[selectedDay].meals.map(slot => (
                    <MealSlotCard 
                        key={slot.id} 
                        slot={slot} 
                        day={selectedDay}
                        dragOverSlotId={dragOverSlotId}
                        onAddItem={() => handleOpenModal(ModalType.ADD_MEAL_ITEM, slot.id)}
                        onEditItem={(item) => handleOpenModal(ModalType.EDIT_MEAL_ITEM, slot.id, item)}
                        onDeleteItem={(itemId) => setItemToDelete({ slotId: slot.id, itemId })}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    />
                ))}
            </div>
            {dayNutrition.calories > 0 && <NutritionSummary {...dayNutrition} />}
             <Modal 
                isOpen={activeModal === ModalType.ADD_MEAL_ITEM || activeModal === ModalType.EDIT_MEAL_ITEM} 
                onClose={handleCloseModal} 
                title={activeModal === ModalType.EDIT_MEAL_ITEM ? "تعديل الصنف" : `إضافة صنف`}>
                <MealForm onSubmit={handleAddOrUpdateMealItem} mealToEdit={itemToEdit} />
            </Modal>
            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleConfirmDeleteMealItem}
                title="تأكيد حذف الصنف"
                message="هل أنت متأكد من حذف هذا الصنف الغذائي؟ لا يمكن التراجع عن هذا الإجراء."
                confirmText="نعم، احذف"
            />
        </>
    );
};

const DaySelector: React.FC<{selectedDay: string, setSelectedDay: (day: string) => void}> = ({selectedDay, setSelectedDay}) => (
     <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 mb-6 shadow flex flex-wrap justify-center gap-2 no-print">
        {DAYS_OF_WEEK.map(day => (
            <button 
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${selectedDay === day ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/50'}`}
            >
                {day}
            </button>
        ))}
    </div>
);

interface MealSlotCardProps {
    slot: MealSlot;
    day: string;
    dragOverSlotId: string | null;
    onAddItem: () => void;
    onEditItem: (item: Meal) => void;
    onDeleteItem: (itemId: string) => void;
    onDragStart: (e: React.DragEvent, meal: Meal, day: string, slotId: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent, slotId: string) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, targetDay: string, targetSlotId: string) => void;
}

const MealSlotCard: React.FC<MealSlotCardProps> = ({
    slot, day, dragOverSlotId, onAddItem, onEditItem, onDeleteItem,
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop
}) => {
    const totalNutrition = slot.meals.reduce((acc, meal) => {
        acc.calories += meal.calories;
        acc.protein += meal.protein;
        acc.carbs += meal.carbs;
        acc.fat += meal.fat;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    const isDragOver = dragOverSlotId === slot.id;

    return (
        <div
            className={`bg-white dark:bg-gray-800/50 rounded-xl shadow-lg transition-all duration-200 ${isDragOver ? 'drag-over-slot' : ''}`}
            onDragOver={(e) => onDragOver(e, slot.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, day, slot.id)}
        >
             <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{slot.title}</h3>
                <button onClick={onAddItem} className="no-print text-sm bg-blue-500 text-white px-3 py-1.5 rounded-full hover:bg-blue-600 transition-colors font-semibold">+ إضافة صنف</button>
            </div>
            <div className="p-4 space-y-3">
                {slot.meals.length > 0 ? slot.meals.map(meal => (
                    <div 
                        key={meal.id} 
                        className="flex justify-between items-start p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-grab"
                        draggable
                        onDragStart={(e) => onDragStart(e, meal, day, slot.id)}
                        onDragEnd={onDragEnd}
                    >
                        <div>
                            <p className="font-semibold">{meal.name}</p>
                            <p className="text-sm text-gray-500">{meal.quantity}</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 text-xs text-center">
                                <Nutrient value={meal.calories.toFixed(0)} label="سعرات" color="text-red-500" />
                                <Nutrient value={meal.protein.toFixed(1)} label="بروتين" color="text-green-500" />
                                <Nutrient value={meal.carbs.toFixed(1)} label="كارب" color="text-yellow-500" />
                                <Nutrient value={meal.fat.toFixed(1)} label="دهون" color="text-purple-500" />
                            </div>
                            <div className="no-print flex flex-col sm:flex-row gap-2">
                                <button onClick={() => onEditItem(meal)} className="text-blue-500 text-xs hover:underline">تعديل</button>
                                <button onClick={() => onDeleteItem(meal.id)} className="text-red-500 text-xs hover:underline">حذف</button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 min-h-[50px]">
                        - فارغ - <br/> <span className="text-xs">(يمكنك سحب الأصناف إلى هنا)</span>
                    </div>
                )}
            </div>
            {totalNutrition.calories > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-b-xl">
                    <div className="grid grid-cols-4 gap-1 text-center">
                        <div><p className="font-bold text-sm">{totalNutrition.calories.toFixed(0)}</p><p className="text-xs text-gray-500">سعرة</p></div>
                        <div><p className="font-bold text-sm">{totalNutrition.protein.toFixed(1)}g</p><p className="text-xs text-gray-500">بروتين</p></div>
                        <div><p className="font-bold text-sm">{totalNutrition.carbs.toFixed(1)}g</p><p className="text-xs text-gray-500">كارب</p></div>
                        <div><p className="font-bold text-sm">{totalNutrition.fat.toFixed(1)}g</p><p className="text-xs text-gray-500">دهون</p></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Profile View ---
const ProfileView: React.FC<{ profile: Profile; setProfile: (p: Profile) => void; updateWeekData: (w: WeekData) => void; }> = ({ profile, setProfile, updateWeekData }) => {
    const [formData, setFormData] = useState(profile);
    const [userRequest, setUserRequest] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<any | null>(() => loadGeneratedPlan());
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isDeletePlanConfirmOpen, setIsDeletePlanConfirmOpen] = useState(false);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'goal' ? value : Number(value) }));
    };

    const handleSaveProfile = () => {
        setProfile(formData);
        alert('تم حفظ الملف الشخصي بنجاح!');
    };
    
    const handleGeneratePlan = async () => {
        setIsGenerating(true);
        setGeneratedPlan(null);
        try {
            const result = await generateMealPlan(formData, userRequest);
            if (result && result.plan) {
                setGeneratedPlan(result.plan);
                saveGeneratedPlan(result.plan);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApplyPlan = () => {
        if (!generatedPlan) return;

        const newWeekData = resetWeekData(); // Start with a fresh structure
        
        generatedPlan.forEach((dayPlan: any, dayIndex: number) => {
            const dayName = DAYS_OF_WEEK[dayIndex];
            if (newWeekData[dayName] && dayPlan.mealSlots) {
                dayPlan.mealSlots.forEach((slotData: any) => {
                    const targetSlot = newWeekData[dayName].meals.find(s => s.title === slotData.slotTitle);
                    if(targetSlot && slotData.items) {
                        targetSlot.meals = slotData.items.map((item: any) => ({
                            id: Date.now().toString() + Math.random(),
                            name: item.name,
                            quantity: item.quantity,
                            calories: item.calories || 0,
                            protein: item.protein || 0,
                            carbs: item.carbs || 0,
                            fat: item.fat || 0
                        }));
                    }
                });
            }
        });

        updateWeekData(newWeekData);
        alert('تمت إضافة الجدول الذكي إلى المخطط بنجاح!');
    };
    
    const handleClearGeneratedPlan = () => {
        setGeneratedPlan(null);
        saveGeneratedPlan(null); // Clears from localStorage
    };

    const handleResetPlan = () => {
        const emptyWeek = resetWeekData();
        updateWeekData(emptyWeek);
        alert("تم حذف جميع البيانات وبدء جدول جديد.");
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-green-600 dark:text-green-400">ملفك الشخصي</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <ProfileInput label="العمر" name="age" type="number" value={formData.age} onChange={handleChange} />
                        <ProfileInput label="الطول (سم)" name="height" type="number" value={formData.height} onChange={handleChange} />
                        <ProfileInput label="الوزن (كغ)" name="weight" type="number" value={formData.weight} onChange={handleChange} />
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهدف</label>
                             <select name="goal" value={formData.goal} onChange={handleChange} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all">
                                <option value="lose">خسارة وزن</option>
                                <option value="maintain">المحافظة على الوزن</option>
                                <option value="gain">بناء عضلات</option>
                            </select>
                        </div>
                         <button onClick={handleSaveProfile} className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">حفظ الملف الشخصي</button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">طلب خاص (اختياري)</label>
                            <textarea
                                value={userRequest}
                                onChange={(e) => setUserRequest(e.target.value)}
                                placeholder="مثال: أريد خطة غنية بالبروتين، أو تجنب أطعمة معينة..."
                                className="w-full h-32 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <button onClick={handleGeneratePlan} disabled={isGenerating} className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400">
                           {isGenerating ? 'جاري الإنشاء...' : 'إنشاء جدول غذائي ذكي'}
                        </button>
                         <div className="pt-4 border-t dark:border-gray-700">
                            <button onClick={() => setIsResetConfirmOpen(true)} className="w-full px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">إعادة تعيين الجدول بالكامل</button>
                         </div>
                    </div>
                </div>
            </div>
            {isGenerating && <LoadingSpinner message="الذكاء الاصطناعي يقوم بإعداد خطتك الآن، قد يستغرق الأمر لحظات..." />}
            {generatedPlan && (
                <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg shadow-md animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4 text-center text-green-600 dark:text-green-400">الخطة الذكية المحفوظة</h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto p-2 border rounded-lg dark:border-gray-700">
                      {generatedPlan.map((dayPlan: any) => (
                          <div key={dayPlan.day} className="border-b dark:border-gray-700 pb-2 last:border-b-0">
                              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{dayPlan.day}</h3>
                              {dayPlan.mealSlots.map((slot: any) => (
                                  <div key={slot.slotTitle} className="pl-4 mt-1">
                                      <h4 className="font-semibold text-gray-600 dark:text-gray-400">{slot.slotTitle}</h4>
                                      <ul className="list-disc pl-5 text-sm">
                                          {slot.items.map((item: any, index: number) => (
                                              <li key={index}>{item.name} ({item.quantity})</li>
                                          ))}
                                      </ul>
                                  </div>
                              ))}
                          </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <button onClick={handleApplyPlan} className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                            تطبيق الخطة على المخطط
                        </button>
                         <button onClick={() => setIsDeletePlanConfirmOpen(true)} className="flex-1 px-4 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                            حذف هذه الخطة
                        </button>
                    </div>
                </div>
            )}
             <ConfirmationModal
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={handleResetPlan}
                title="تأكيد إعادة تعيين الجدول"
                message="هل تريد بالتأكيد إعادة تعيين الجدول بالكامل؟ سيتم مسح جميع بيانات الوجبات والتمارين الحالية."
                confirmText="نعم، أعد التعيين"
            />
            <ConfirmationModal
                isOpen={isDeletePlanConfirmOpen}
                onClose={() => setIsDeletePlanConfirmOpen(false)}
                onConfirm={handleClearGeneratedPlan}
                title="تأكيد حذف الخطة"
                message="هل أنت متأكد أنك تريد حذف هذه الخطة المقترحة؟ لا يمكن التراجع عن هذا الإجراء."
                confirmText="نعم، احذف"
            />
        </div>
    );
};

// ... (Rest of the components: ProfileInput, Analytics, Info, Chatbot, Footer, etc. are largely the same)
const Nutrient: React.FC<{ value: string, label: string, color: string }> = ({ value, label, color }) => (
    <div className="w-12">
        <p className={`font-bold ${color}`}>{value}</p>
        <p className="text-gray-500 dark:text-gray-400 text-[10px]">{label}</p>
    </div>
);

const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">{children}</p>
);

const NutritionSummary: React.FC<NutritionalInfo> = ({ calories, protein, carbs, fat }) => (
    <div className="bg-green-50 dark:bg-green-900/50 p-4 rounded-lg mt-6">
        <h4 className="font-bold text-center mb-2 text-green-800 dark:text-green-200">إجمالي اليوم</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div><p className="font-bold text-lg">{calories.toFixed(0)}</p><p className="text-sm">سعرة</p></div>
            <div><p className="font-bold text-lg">{protein.toFixed(1)}g</p><p className="text-sm">بروتين</p></div>
            <div><p className="font-bold text-lg">{carbs.toFixed(1)}g</p><p className="text-sm">كارب</p></div>
            <div><p className="font-bold text-lg">{fat.toFixed(1)}g</p><p className="text-sm">دهون</p></div>
        </div>
    </div>
);

const ProfileInput: React.FC<{ label: string } & React.InputHTMLAttributes<HTMLInputElement>> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input {...props} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" />
    </div>
);


// --- Analytics View ---
const AnalyticsView: React.FC<{ weekData: WeekData }> = ({ weekData }) => {
    const weeklyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, exerciseCount: 0, exerciseMinutes: 0 };
    const dailyData = DAYS_OF_WEEK.map(day => {
        const dayInfo = weekData[day];
        const nutrition = dayInfo.meals.reduce((acc, slot) => {
             slot.meals.forEach(meal => {
                acc.calories += meal.calories;
                acc.protein += meal.protein;
                acc.carbs += meal.carbs;
                acc.fat += meal.fat;
            });
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

        const exercises = dayInfo.exercises.length;
        const duration = dayInfo.exercises.reduce((acc, ex) => acc + (parseInt(ex.duration) || 0), 0);
        
        weeklyTotals.calories += nutrition.calories;
        weeklyTotals.protein += nutrition.protein;
        weeklyTotals.carbs += nutrition.carbs;
        weeklyTotals.fat += nutrition.fat;
        weeklyTotals.exerciseCount += exercises;
        weeklyTotals.exerciseMinutes += duration;

        const missingData = dayInfo.meals.some(slot => slot.meals.some(m => m.calories === 0 && m.name));
        
        return { day, nutrition, exercises, duration, missingData };
    });

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg shadow-md">
                 <h2 className="text-2xl font-bold mb-4 text-center text-green-600 dark:text-green-400">الملخص الأسبوعي</h2>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                    <AnalyticsCard value={weeklyTotals.calories.toFixed(0)} label="إجمالي السعرات" />
                    <AnalyticsCard value={`${weeklyTotals.protein.toFixed(1)}g`} label="إجمالي البروتين" />
                    <AnalyticsCard value={`${weeklyTotals.carbs.toFixed(1)}g`} label="إجمالي الكارب" />
                    <AnalyticsCard value={`${weeklyTotals.fat.toFixed(1)}g`} label="إجمالي الدهون" />
                    <AnalyticsCard value={weeklyTotals.exerciseCount.toString()} label="عدد التمارين" />
                    <AnalyticsCard value={`${weeklyTotals.exerciseMinutes} دقيقة`} label="وقت التمرين" />
                 </div>
            </div>
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-center text-gray-700 dark:text-gray-300">تفاصيل يومية</h2>
                <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                         <table className="w-full text-right">
                             <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="p-3 font-semibold text-sm">اليوم</th>
                                    <th className="p-3 font-semibold text-sm">السعرات</th>
                                    <th className="p-3 font-semibold text-sm">البروتين</th>
                                    <th className="p-3 font-semibold text-sm">الكارب</th>
                                    <th className="p-3 font-semibold text-sm">الدهون</th>
                                    <th className="p-3 font-semibold text-sm">التمارين</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {dailyData.map(data => (
                                    <tr key={data.day} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="p-3 font-bold">{data.day} {data.missingData && <span className="text-yellow-500" title="بيانات ناقصة">⚠️</span>}</td>
                                        <td className="p-3">{data.nutrition.calories.toFixed(0)}</td>
                                        <td className="p-3">{data.nutrition.protein.toFixed(1)}g</td>
                                        <td className="p-3">{data.nutrition.carbs.toFixed(1)}g</td>
                                        <td className="p-3">{data.nutrition.fat.toFixed(1)}g</td>
                                        <td className="p-3">{data.exercises} ({data.duration} د)</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AnalyticsCard: React.FC<{ value: string, label: string }> = ({ value, label }) => (
    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
        <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</p>
    </div>
)


// --- Info View ---
const InfoView: React.FC = () => (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800/50 p-8 rounded-lg shadow-md text-center">
        <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">ode منظم اللياقة والتغذية</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">تطبيق ويب يساعدك على تنظيم ومتابعة جدولك الرياضي والغذائي بكل سهولة. جميع بياناتك محفوظة محليًا في متصفحك لضمان خصوصيتك.</p>
        <div className="text-gray-600 dark:text-gray-400">
            <p><span className="font-semibold">المطور:</span> عدي قطقط</p>
            <p><span className="font-semibold">البريد الإلكتروني:</span> oday5qutqut@gmail.com</p>
        </div>
    </div>
);

// --- Chatbot View ---
interface Message {
    role: 'user' | 'model';
    text: string;
}

const ChatbotView: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatSession = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const initChat = () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                chatSession.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                      systemInstruction: 'أنت مساعد ذكي وخبير في مجال اللياقة البدنية والتغذية. قدم إجابات مفيدة وداعمة باللغة العربية.',
                    },
                });
            } catch (error) {
                console.error("Failed to initialize chat session:", error);
                setMessages([{ role: 'model', text: 'عذراً، حدث خطأ أثناء تهيئة المساعد الذكي. قد يكون مفتاح API غير صالح.' }]);
            }
        };
        initChat();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading || !chatSession.current) return;

        const userMessage: Message = { role: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const response = await chatSession.current.sendMessage({ message: userInput });
            const modelMessage: Message = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Error sending message to Gemini:", error);
            const errorMessage: Message = { role: 'model', text: 'عذراً، لم أتمكن من معالجة طلبك. الرجاء المحاولة مرة أخرى.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800/50 rounded-lg shadow-md flex flex-col h-[70vh]">
            <h2 className="text-xl font-bold p-4 border-b dark:border-gray-700 text-center text-green-600 dark:text-green-400">المساعد الذكي</h2>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 && !isLoading && (
                     <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                        <p>أهلاً بك! أنا مساعدك الذكي.</p>
                        <p>كيف يمكنني مساعدتك اليوم في رحلتك نحو اللياقة والتغذية؟</p>
                     </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-lg px-4 py-2 rounded-2xl ${msg.role === 'user' 
                            ? 'bg-green-600 text-white rounded-br-none' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                        }`}>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="px-4 py-2 rounded-2xl bg-gray-200 dark:bg-gray-700">
                             <div className="flex items-center space-x-2 space-x-reverse">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                             </div>
                        </div>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-gray-700 flex items-center">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="اسأل عن التمارين، السعرات، أو أي شيء آخر..."
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    disabled={isLoading}
                />
                <button type="submit" className="mr-3 p-2 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 transition-colors" disabled={isLoading || !userInput.trim()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

const Footer: React.FC = () => (
    <footer className="text-center mt-12 text-gray-500 dark:text-gray-400 text-sm no-print">
        <p>بياناتك يتم حفظها محليًا في متصفحك ولا يتم مشاركتها مع أي جهة.</p>
    </footer>
);

export default App;
// Add this to your main stylesheet or a style tag in your HTML head
const style = document.createElement('style');
style.textContent = `
    .animate-fade-in {
        animation: fadeIn 0.5s ease-in-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .dragging-meal {
        opacity: 0.5;
        background-color: #e5e7eb; /* gray-200 */
        transform: rotate(2deg);
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    }
    .drag-over-slot {
        border: 2px dashed #22c55e; /* green-500 */
        background-color: rgba(34, 197, 94, 0.1);
    }
`;
document.head.appendChild(style);