import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {localDate, validDate} from './logic';
import {brazilianDate, monthGrid, pageFromDate, shiftMonth, tomorrow} from './calendar';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const C = {
  panel: '#111E31', bg: '#08101E', surface: '#16273D', border: '#24394F',
  text: '#EFF6FF', muted: '#9CB0C8', accent: '#47B7F6',
};

export function CalendarPicker({value, onSelect, onCancel}: {
  value: string;
  onSelect: (date: string) => void;
  onCancel: () => void;
}) {
  const [page, setPage] = useState(() => pageFromDate(value));
  const grid = useMemo(() => monthGrid(page), [page]);
  const today = localDate();
  const move = (delta: -1 | 1) => setPage(current => shiftMonth(current, delta) ?? current);
  const canBack = shiftMonth(page, -1) !== null;
  const canNext = shiftMonth(page, 1) !== null;

  return <View style={styles.panel}>
    <View style={styles.heading}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior"
        disabled={!canBack} style={[styles.arrow, !canBack && styles.disabled]} onPress={() => move(-1)}>
        <Text style={styles.arrowText}>‹</Text>
      </Pressable>
      <Text style={styles.headingText}>{MONTHS[page.month - 1]} de {page.year}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês"
        disabled={!canNext} style={[styles.arrow, !canNext && styles.disabled]} onPress={() => move(1)}>
        <Text style={styles.arrowText}>›</Text>
      </Pressable>
    </View>
    <View style={styles.grid}>
      {WEEKDAYS.map((weekDay, index) => <View key={index} style={styles.daySlot}>
        <Text style={styles.weekday}>{weekDay}</Text>
      </View>)}
      {grid.map((date, index) => {
        const selected = !!date && date === value;
        const current = !!date && date === today;
        const day = date ? Number(date.slice(-2)) : '';
        return <View key={index} style={styles.daySlot}>
          {date ? <Pressable accessibilityRole="button"
            accessibilityLabel={`Selecionar ${brazilianDate(date)}`}
            accessibilityState={{selected}}
            style={[styles.dateButton, selected && styles.selected, current && !selected && styles.today]}
            onPress={() => onSelect(date)}>
            <Text style={[styles.dateText, selected && styles.selectedText]}>{day}</Text>
          </Pressable> : <View style={styles.dateButton}/>}
        </View>;
      })}
    </View>
    <View style={styles.shortcuts}>
      <Pressable accessibilityRole="button" style={styles.quick} onPress={() => onSelect(today)}>
        <Text style={styles.quickText}>Hoje</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.quick} onPress={() => onSelect(tomorrow())}>
        <Text style={styles.quickText}>Amanhã</Text>
      </Pressable>
    </View>
    <Text style={styles.caption}>Toque no dia desejado. A data só será alterada quando você selecionar um dia.</Text>
    <Pressable accessibilityRole="button" style={styles.cancel} onPress={onCancel}>
      <Text style={styles.cancelText}>Voltar sem alterar</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  panel: {backgroundColor: C.panel, paddingBottom: 12},
  heading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14},
  headingText: {fontWeight: '800', color: C.text, fontSize: 17, textTransform: 'capitalize'},
  arrow: {width: 44, height: 44, borderRadius: 10, alignItems: 'center',
    justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border},
  disabled: {opacity: 0.3},
  arrowText: {fontSize: 30, color: C.text, lineHeight: 34},
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  daySlot: {width: '14.285714%', minHeight: 43, alignItems: 'center', justifyContent: 'center'},
  weekday: {color: C.muted, fontWeight: '700', fontSize: 12, marginBottom: 5},
  dateButton: {width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 12},
  selected: {backgroundColor: C.accent},
  today: {borderWidth: 1, borderColor: C.accent},
  dateText: {color: C.text, fontSize: 15, fontWeight: '600'},
  selectedText: {color: C.bg, fontWeight: '900'},
  shortcuts: {flexDirection: 'row', gap: 10, marginTop: 16},
  quick: {flex: 1, paddingVertical: 12, backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, alignItems: 'center'},
  quickText: {color: C.accent, fontWeight: '800'},
  caption: {fontSize: 11, color: C.muted, lineHeight: 17, marginTop: 14},
  cancel: {alignSelf: 'center', minHeight: 42, padding: 10, justifyContent: 'center', marginTop: 8},
  cancelText: {color: C.text, fontWeight: '700'},
});
