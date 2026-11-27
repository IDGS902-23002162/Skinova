from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.modules.habitos_desafios.models import Habit

try:
    LOCAL_TIME = ZoneInfo('America/Mexico_City')
except ZoneInfoNotFoundError:
    LOCAL_TIME = timezone(timedelta(hours=-6))

ONE_DAY = timedelta(days=1)


def _local_date(value):
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(LOCAL_TIME).date()


def _settings(item):
    if isinstance(item, Habit):
        return (item.frequency or 'daily', item.target_value or 1, item.unit or 'veces')
    return ('challenge', item.duration_days or 7, item.unit or 'días')


def _period_end(start, cadence, target):
    if cadence == 'weekly':
        return start + timedelta(days=6 - start.weekday())
    if cadence == 'challenge':
        return start + timedelta(days=target - 1)
    return start


def _rule(item, start, end=None):
    cadence, target, unit = _settings(item)
    return {
        'start': start.isoformat(),
        'end': (end or _period_end(start, cadence, target)).isoformat(),
        'cadence': cadence,
        'target': target,
        'unit': unit,
    }


def initialize_cycle(item, today):
    item.cycle_plan = {'rules': [_rule(item, today)]}


def cycle_plan(item):
    if item.cycle_plan:
        return item.cycle_plan
    is_habit = isinstance(item, Habit)
    start = _local_date(item.created_at if is_habit else item.started_at or item.created_at)
    rule = _rule(item, start)
    if not is_habit and item.status == 'completed':
        completed = _local_date(item.completed_at) if item.completed_at else date.fromisoformat(rule['end'])
        rule['end'] = max(completed.isoformat(), rule['end'])
        rule['legacy_completion'] = max(start.isoformat(), completed.isoformat())
    plan = {'rules': [rule]}
    if (is_habit and not item.active) or (not is_habit and item.status == 'archived'):
        plan['stopped_on'] = _local_date(item.updated_at or item.created_at).isoformat()
    return plan


def _periods(plan, today):
    rules = plan['rules']
    for index, rule in enumerate(rules):
        stopped_on = rule.get('stopped_on') or plan.get('stopped_on')
        stop = date.fromisoformat(stopped_on) if stopped_on else None
        limit = min(today, stop) if stop else today
        start = date.fromisoformat(rule['start'])
        end = date.fromisoformat(rule['end'])
        next_start = date.fromisoformat(rules[index + 1]['start']) if index + 1 < len(rules) else None
        first = True
        while start <= limit and (next_start is None or start < next_start):
            stopped = stop if stop and start <= stop <= end and stop <= today else None
            yield start, end, rule, first, stopped
            if end >= limit:
                break
            start = end + ONE_DAY
            end = _period_end(start, rule['cadence'], rule['target'])
            first = False


def cycle_progress(item, today, entries):
    plan = cycle_plan(item)
    dated_entries = iter(sorted(entries.items()))
    entry = next(dated_entries, None)
    history = []
    current = None
    raw_total = 0
    today_value = 0
    for start, end, rule, first, stopped in _periods(plan, today):
        target = rule['target']
        total = 0
        completed_on = None
        last_day = stopped or min(end, today)
        while entry and entry[0] <= last_day:
            if entry[0] >= start:
                total += entry[1]
                if completed_on is None and total >= target:
                    completed_on = entry[0].isoformat()
            entry = next(dated_entries, None)
        if total == 0 and first and rule.get('legacy_completion') and rule['legacy_completion'] <= last_day.isoformat():
            completed_on = rule['legacy_completion']
            total = target
        closed = bool(stopped) or end < today
        status = 'active'
        if completed_on:
            status = 'completed'
        elif closed:
            status = 'cancelled' if stopped else 'failed'
        period = {
            'start': start.isoformat(),
            'end': (last_day if stopped else end).isoformat(),
            'target': target,
            'unit': rule['unit'],
            'cadence': rule['cadence'],
            'value': min(total, target),
            'completed_on': completed_on,
            'status': status,
        }
        if closed:
            history.append(period)
        else:
            current = period
            raw_total = total
            today_raw = entries.get(today, 0)
            today_value = min(today_raw, max(0, target - (total - today_raw)))

    return {
        'period': current,
        'history': history[::-1],
        'failed_count': sum(period['status'] == 'failed' for period in history),
        'raw_total': raw_total,
        'today_value': today_value,
    }


def update_cycle(item, plan, current, today):
    cadence, target, unit = _settings(item)
    if current and (current['cadence'], current['target'], current['unit']) != (cadence, target, unit):
        start = date.fromisoformat(current['start'])
        end = _period_end(today if cadence == 'weekly' else start, cadence, target)
        rule = _rule(item, start, max(today, end))
        plan = {**plan, 'rules': [entry for entry in plan['rules'] if entry['start'] < rule['start']] + [rule]}
    item.cycle_plan = plan


def set_tracking_stopped(item, today, stopped):
    plan = dict(cycle_plan(item))
    if stopped:
        plan.setdefault('stopped_on', today.isoformat())
    else:
        stopped_on = plan.pop('stopped_on', None)
        if stopped_on and stopped_on < today.isoformat():
            *previous, last = plan['rules']
            plan['rules'] = [*previous, {**last, 'stopped_on': stopped_on}, _rule(item, today)]
    item.cycle_plan = plan


def completion_timestamp(period):
    if period and period['completed_on']:
        return datetime.combine(date.fromisoformat(period['completed_on']), time.min, LOCAL_TIME).isoformat()
    return None
