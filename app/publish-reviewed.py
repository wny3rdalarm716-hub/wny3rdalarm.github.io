#!/usr/bin/env python3
"""Prepare a minimal public record after a human review. No raw feed is read."""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

FEED = Path(__file__).resolve().with_name('reviewed-incidents.json')
CATEGORIES = ('STRUCTURE FIRE', 'VEHICLE FIRE', 'BRUSH FIRE', 'OUTSIDE FIRE', 'FIRE')


def validate_existing(records, now):
    if not isinstance(records, list):
        raise ValueError('Feed must be an array.')
    clean = []
    for item in records:
        if not isinstance(item, dict) or set(item) != {'reviewed', 'type', 'time'}:
            raise ValueError('Unexpected fields in existing feed; stop and review the file.')
        if item['reviewed'] is not True or item['type'] not in CATEGORIES or not isinstance(item['time'], str):
            raise ValueError('Unapproved record in existing feed; stop and review the file.')
        try:
            date = datetime.strptime(item['time'], '%Y-%m-%dT%H:00:00Z').replace(tzinfo=timezone.utc)
        except ValueError as exc:
            raise ValueError('Each time must be a UTC hour: YYYY-MM-DDTHH:00:00Z.') from exc
        if date > now:
            raise ValueError('Existing record has a future time.')
        if now - date <= timedelta(hours=24):
            clean.append(item)
    return clean


def main():
    print('Create a PUBLIC, general fire summary. This tool does not read dispatch feeds.')
    print('Only proceed after reviewing the source for public release. Never enter names,')
    print('addresses, medical details, dispatch notes, or other sensitive information.')
    for index, category in enumerate(CATEGORIES, 1):
        print(f'{index}. {category}')
    choice = input('Reviewed public category number (or blank to cancel): ').strip()
    if not choice:
        print('Cancelled; no file changed.')
        return
    if choice not in tuple(str(x) for x in range(1, len(CATEGORIES) + 1)):
        raise ValueError('Invalid category.')
    now = datetime.now(timezone.utc)
    hour = now.replace(minute=0, second=0, microsecond=0)
    timestamp = hour.strftime('%Y-%m-%dT%H:00:00Z')
    category = CATEGORIES[int(choice) - 1]
    print(f'Proposed PUBLIC record: {category}; Western New York; {timestamp} (review hour).')
    print('The timestamp is the review hour, not a verified incident time.')
    if input('Type REVIEWED to confirm human review for public release: ').strip() != 'REVIEWED':
        print('Cancelled; no file changed.')
        return
    with FEED.open(encoding='utf-8') as source:
        records = validate_existing(json.load(source), now)
    records.append({'reviewed': True, 'type': category, 'time': timestamp})
    records = records[-30:]
    temp = FEED.with_suffix('.json.tmp')
    try:
        with temp.open('w', encoding='utf-8') as output:
            json.dump(records, output, indent=2)
            output.write('\n')
        os.replace(temp, FEED)
    finally:
        if temp.exists():
            temp.unlink()
    print('Prepared locally. Submit the change for independent review before publishing.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, json.JSONDecodeError) as error:
        raise SystemExit(f'Not published: {error}')
