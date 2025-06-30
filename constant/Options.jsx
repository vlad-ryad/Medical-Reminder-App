/**
 * Константы с вариантами выбора для формы лекарств
 * Содержит:
 * - Типы лекарств с иконками
 * - Варианты времени приема
 * - Единицы измерения дозировки
 */

export const TypeList = [
	{
		name: 'Таблетки',
		icon: require('../assets/images/tablets.png')
		//assetPath: "assets/images/tablets.png"
		//icon: 'https://img.icons8.com/?size=100&id=pMiRMe6LU4sg&format=png&color=000000'
	},
	{
		name: 'Капсулы',
		icon: require('../assets/images/capsules.png')
		//assetPath: "assets/images/capsules.png"
		//icon: 'https://img.icons8.com/?size=100&id=InpJdxSqS5fS&format=png&color=000000'
	},
	{
		name: 'Капли',
		icon: require('../assets/images/drops.png')
		//assetPath: "assets/images/drops.png"
		//icon: 'https://img.icons8.com/?size=100&id=64442&format=png&color=000000'
	},
	{
		name: 'Сироп',
		icon: require('../assets/images/syrup.png')
		//assetPath: "assets/images/syrup.png",
		//icon: 'https://img.icons8.com/?size=100&id=ygGtC331vutp&format=png&color=000000'
	},
	{
		name: 'Инъекция',
		icon: require('../assets/images/injection.png')
		//assetPath: "assets/images/injection.png"
		//icon: 'https://img.icons8.com/?size=100&id=VJFvX8BBbkLh&format=png&color=000000'
	},
	{
		name: 'Другое',
		icon: require('../assets/images/other.png')
		//assetPath: "assets/images/other.png"
		//icon: 'https://img.icons8.com/?size=100&id=U6PfCprGxJ0u&format=png&color=000000'
	}
]

export const WhenToTake = [
	'Когда принимать',
	'Утром',
	'Перед обедом',
	'После обеда',
	'Днем',
	'Вечером',
	'Перед ужином',
	'После ужина',
	'Перед сном'
]

export const DoseTypes = [
	'таб.',
	'мл.',
	'мг.',
	'г.',
	'кап.',
	'шт.'
];

export const ReminderTypes = [
	{ value: 'before_meal_15', label: 'За 15 минут до еды' },
	{ value: 'before_meal_30', label: 'За 30 минут до еды' },
	{ value: 'after_meal', label: 'Сразу после еды' },
	{ value: 'specific_time', label: 'В указанное время' },
	{ value: 'before_injection_10', label: 'За 10 минут до инъекции' },
	{ value: 'before_injection_30', label: 'За 30 минут до инъекции' }
];

export const FrequencyTypes = [
	{ value: 'daily', label: 'Ежедневно' },
	{ value: 'every_other_day', label: 'Через день' },
	{ value: 'twice_daily', label: '2 раза в день' },
	{ value: 'three_times_daily', label: '3 раза в день' },
	{ value: 'specific_days', label: 'По определенным дням' }
];

export const DaysOfWeek = [
	{ value: 'mon', label: 'Понедельник' },
	{ value: 'tue', label: 'Вторник' },
	{ value: 'wed', label: 'Среда' },
	{ value: 'thu', label: 'Четверг' },
	{ value: 'fri', label: 'Пятница' },
	{ value: 'sat', label: 'Суббота' },
	{ value: 'sun', label: 'Воскресенье' }
];