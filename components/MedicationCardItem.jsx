// Импорт необходимых модулей и компонентов
import { View, Text, Image, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import Colors from '../constant/Colors'; // Цветовые константы приложения
import Ionicons from '@expo/vector-icons/Ionicons'; // Иконки

/**
 * Компонент MedicationCardItem — отображает карточку одного лекарства.
 * Показывает основную информацию о лекарстве и его статус за выбранный день.
 */
export default function MedicationCardItem({ medicine, selectedDate = '' }) {
    // Состояние для хранения статуса приёма лекарства за выбранный день
    const [statuses, setStatuses] = useState([]);

    // При изменении лекарства или даты проверяем статус
    useEffect(() => {
        CheckStatus();
    }, [medicine, selectedDate]);

    // Функция для фильтрации действий по выбранной дате
    const CheckStatus = () => {
        if (Array.isArray(medicine?.action)) {
            const data = medicine.action.filter(item => item.date === selectedDate);
            setStatuses(data);
        } else {
            setStatuses([]);
        }
    };

    return (
        <View style={styles.container}>
            {/* Левый столбец с иконками статусов: принят или пропущен */}
            <View style={styles.statusColumn}>
                {statuses.map((entry, index) => (
                    <Ionicons
                        key={index}
                        name={entry.status === 'Taken' ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={entry.status === 'Taken' ? Colors.GREEN : 'red'}
                        style={styles.statusIcon}
                    />
                ))}
            </View>

            {/* Иконка лекарства */}
            <View style={styles.imageContainer}>
                <Image
                    source={medicine?.type?.icon}
                    style={{ width: 60, height: 60 }}
                    resizeMode="contain"
                />
            </View>

            {/* Основная информация о лекарстве */}
            <View style={styles.contentContainer}>
                {/* Название лекарства */}
                <Text style={styles.name} numberOfLines={2}>{medicine?.name}</Text>

                {/* Дозировка и тип лекарства */}
                <Text style={styles.dose} numberOfLines={1}>{medicine?.dose} {medicine?.type?.name}</Text>

                {/* Время приёма из whenToTake (например, "Утром", "Перед сном") */}
                {medicine.whenToTake?.length > 0 && (
                    <Text style={styles.details}>
                        ⏰ Когда принимать: {medicine.whenToTake.join(', ')}
                    </Text>
                )}

                {/* Конкретное время приёма в формате времени (например, "08:00", "20:30") */}
                {medicine.times?.length > 0 && (
                    <Text style={styles.details}>
                        🕒 Время приема: {medicine.times.join(', ')}
                    </Text>
                )}

                {/* Частота приёма (ежедневно, через день, по дням недели) */}
                {medicine.frequency && (
                    <Text style={styles.details}>
                        🔁 Повтор: {
                            medicine.frequency === 'daily' ? 'Каждый день' :
                                medicine.frequency === 'every2' ? 'Через день' :
                                    `По дням: ${medicine.weekdays?.join(', ') || ''}`
                        }
                    </Text>
                )}
            </View>
        </View>
    );
}

// Стили для компонента
const styles = StyleSheet.create({
    container: {
        padding: 10,
        borderWidth: 1,
        borderColor: Colors.LIGHT_GRAY_BORDER,
        marginTop: 10,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },

    statusColumn: {
        flexDirection: 'column',
        alignItems: 'center',
    },

    imageContainer: {
        padding: 2.5,
        backgroundColor: 'white',
        borderRadius: 15,
        marginRight: 15,
    },

    statusIcon: {
        marginVertical: 1,
    },

    contentContainer: {
        flex: 1,
    },

    name: {
        fontSize: 18,
        fontWeight: 'bold',
        flexShrink: 1,
        flexWrap: 'wrap',
    },

    when: {
        fontSize: 15,
        color: Colors.GRAY,
        flexWrap: 'wrap',
    },

    dose: {
        fontSize: 16,
        marginTop: 2,
        color: Colors.DARK_GRAY,
        flexWrap: 'wrap',
    },

    details: {
        fontSize: 15,
        marginTop: 4,
        color: Colors.DARK_GRAY,
        flexWrap: 'wrap',
    },
});