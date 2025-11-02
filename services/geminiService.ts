import { GoogleGenAI, Type } from "@google/genai";
import { Profile, NutritionalInfo } from '../types';

// يفترض هذا الكود أن مفتاح API متاح كمتغير بيئة `process.env.API_KEY`
// ويتم توفيره في بيئة التشغيل.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// تم تحديث المخطط ليعكس هيكل الوجبات الجديد الذي يحتوي على أصناف متعددة
const mealPlanSchema = {
    type: Type.OBJECT,
    properties: {
        plan: {
            type: Type.ARRAY,
            description: "مصفوفة تحتوي على 7 أيام للأسبوع، تبدأ بيوم الأحد.",
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING },
                    mealSlots: {
                        type: Type.ARRAY,
                        description: "قائمة بفترات الوجبات لليوم (مثل الإفطار، الغداء).",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                slotTitle: { type: Type.STRING, description: "اسم فترة الوجبة، يجب أن يكون واحدًا من: 'الإفطار', 'ما بعد الإفطار', 'الغداء', 'ما بعد الغداء', 'العشاء', 'ما بعد العشاء'." },
                                items: {
                                    type: Type.ARRAY,
                                    description: "قائمة بالأصناف الغذائية لهذه الوجبة.",
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING, description: "اسم الصنف الغذائي. مثال: 'شوفان بالحليب'." },
                                            quantity: { type: Type.STRING, description: "كمية مقترحة. مثال: '1 كوب'." },
                                            calories: { type: Type.NUMBER, description: "تقدير للسعرات الحرارية." },
                                            protein: { type: Type.NUMBER, description: "تقدير للبروتين بالجرام." },
                                            carbs: { type: Type.NUMBER, description: "تقدير للكربوهيدرات بالجرام." },
                                            fat: { type: Type.NUMBER, description: "تقدير للدهون بالجرام." }
                                        },
                                        required: ["name", "quantity", "calories", "protein", "carbs", "fat"]
                                    }
                                }
                            },
                            required: ["slotTitle", "items"]
                        }
                    }
                },
                required: ["day", "mealSlots"]
            }
        }
    },
    required: ["plan"]
};


export const generateMealPlan = async (profile: Profile, userRequest: string): Promise<any | null> => {
    const goalMap = {
        lose: 'خسارة الوزن',
        maintain: 'المحافظة على الوزن',
        gain: 'زيادة الوزن وبناء العضلات'
    };
    
    // تم تحديث الطلب ليكون أكثر تفصيلاً ويدعم الطلبات المخصصة من المستخدم
    const prompt = `
        أنشئ خطة وجبات غذائية مفصلة ومتنوعة لمدة 7 أيام لشخص يبلغ من العمر ${profile.age} عامًا، وطوله ${profile.height} سم، ووزنه ${profile.weight} كجم.
        هدفه هو: ${goalMap[profile.goal]}.
        
        بالإضافة إلى ذلك، يرجى مراعاة الطلب المحدد التالي من المستخدم: "${userRequest || 'لا توجد تفضيلات إضافية'}"

        لكل يوم من أيام الأسبوع (الأحد إلى السبت)، اقترح وجبات ضمن الخانات التالية بالترتيب:
        'الإفطار', 'ما بعد الإفطار', 'الغداء', 'ما بعد الغداء', 'العشاء', 'ما بعد العشاء'.

        لكل خانة وجبة، قدم قائمة بالأصناف الغذائية التي تتكون منها. يمكن أن تحتوي الوجبة على صنف واحد أو أكثر.
        لكل صنف غذائي، قدم اسمًا، كمية مقترحة، وتقديرًا دقيقًا لقيمه الغذائية (السعرات، البروتين، الكربوهيدرات، الدهون).
        
        مثال لهيكل خانة 'الإفطار':
        - الصنف الأول: "بيضتان مسلوقتان", الكمية: "2 حجم كبير".
        - الصنف الثاني: "شريحة خبز أسمر", الكمية: "30 جرام".

        يجب أن تكون أسماء الوجبات متنوعة ومناسبة للثقافة العربية.
        قدم الإجابة بصيغة JSON فقط، مطابقة للمخطط المحدد بدقة.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: mealPlanSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        return parsedJson;

    } catch (error) {
        console.error("Error generating meal plan with Gemini API:", error);
        alert("فشل إنشاء الخطة الغذائية. قد تكون هناك مشكلة في الاتصال بالخادم أو أن مفتاح API غير صالح. الرجاء المحاولة مرة أخرى.");
        return null;
    }
};


// مخطط للبحث عن المعلومات الغذائية
const nutritionInfoSchema = {
    type: Type.OBJECT,
    properties: {
        calories: { type: Type.NUMBER, description: "إجمالي السعرات الحرارية للكمية المحددة." },
        protein: { type: Type.NUMBER, description: "إجمالي البروتين بالجرام." },
        carbs: { type: Type.NUMBER, description: "إجمالي الكربوهيدرات بالجرام." },
        fat: { type: Type.NUMBER, description: "إجمالي الدهون بالجرام." }
    },
    required: ["calories", "protein", "carbs", "fat"]
};

/**
 * دالة للبحث عن المعلومات الغذائية لطعام معين باستخدام Gemini.
 * @param foodName - اسم الطعام (مثال: "صدر دجاج مشوي").
 * @param quantity - الكمية (مثال: "150 جرام").
 * @returns كائن يحتوي على المعلومات الغذائية أو null في حالة الفشل.
 */
export const fetchNutritionWithGemini = async (foodName: string, quantity: string): Promise<NutritionalInfo | null> => {
    const prompt = `
        احسب المعلومات الغذائية (السعرات الحرارية، البروتين، الكربوهيدرات، والدهون) للمادة الغذائية التالية.
        قدم أفضل تقدير ممكن بناءً على قواعد بيانات الأطعمة الشائعة.

        الطعام: "${foodName}"
        الكمية: "${quantity}"

        قدم الإجابة بصيغة JSON فقط، مطابقة للمخطط المحدد. لا تضف أي نصوص أو شروحات أخرى.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: nutritionInfoSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        return parsedJson;

    } catch (error) {
        console.error("Error fetching nutrition with Gemini API:", error);
        return null;
    }
};