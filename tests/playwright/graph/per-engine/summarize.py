#!/usr/bin/env python3
"""Aggregate SAA-729 per-engine UI validation reports into a matrix.

Reads ``.reports/<engine>.json`` (lists of
``{engine, fixture, action, status, pass, detail}``) and prints a
fixture x engine x {list, show, replay, i-o, route, failure, deployment}
table plus failure detail.
"""
import json
import os
import sys

ACTIONS = ["list", "show", "replay", "i-o", "route", "failure", "deployment"]


def load(report_dir, engine):
    path = os.path.join(report_dir, f"{engine}.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path) as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return None


def cell(rows, fixture, action):
    for row in rows:
        if row["fixture"] == fixture and row["action"] == action:
            status = row.get("status")
            if status is None:
                # Older reports only carry the boolean.
                status = "pass" if row.get("pass") else "fail"
            return {"pass": "PASS", "fail": "FAIL", "skip": "SKIP"}.get(status, "FAIL")
    return "--"


def main():
    report_dir = sys.argv[1]
    engines = sys.argv[2].split()
    by_engine = {engine: load(report_dir, engine) for engine in engines}

    fixtures = []
    for rows in by_engine.values():
        if rows:
            for row in rows:
                if row["fixture"] not in fixtures:
                    fixtures.append(row["fixture"])
    fixtures.sort()

    print("legend: P=PASS  F=FAIL  S=SKIP (not applicable / expected failure)  - = no row")
    header = f"{'fixture':<26}" + "".join(
        f"| {engine}:{'/'.join(ACTIONS)}" for engine in engines
    )
    print(header)
    print("-" * len(header))

    failures = []
    skips = []
    totals = {engine: {"pass": 0, "fail": 0, "skip": 0} for engine in engines}
    for fixture in fixtures:
        line = f"{fixture:<26}"
        for engine in engines:
            rows = by_engine[engine] or []
            marks = []
            for action in ACTIONS:
                mark = cell(rows, fixture, action)
                marks.append(mark)
                if mark == "PASS":
                    totals[engine]["pass"] += 1
                elif mark == "FAIL":
                    totals[engine]["fail"] += 1
                elif mark == "SKIP":
                    totals[engine]["skip"] += 1
            line += "| " + "".join(
                {"PASS": "P", "FAIL": "F", "SKIP": "S", "--": "-"}[mark] for mark in marks
            ) + " " * 4
        print(line)

    print("")
    for engine in engines:
        rows = by_engine[engine]
        if rows is None:
            print(f"{engine}: NO REPORT (runner did not produce {engine}.json)")
            continue
        print(
            f"{engine}: {totals[engine]['pass']} pass / {totals[engine]['fail']} fail"
            f" / {totals[engine]['skip']} skip"
        )
        for row in rows:
            status = row.get("status")
            if status is None:
                status = "pass" if row.get("pass") else "fail"
            if status == "pass":
                continue
            detail = f" — {row['detail']}" if row.get("detail") else ""
            line = f"  {engine} {row['fixture']} {row['action']}: {status.upper()}{detail}"
            if status == "skip":
                skips.append(line)
            else:
                failures.append(line)

    if failures:
        print("\nfailures:")
        print("\n".join(failures))
    if skips:
        print("\nskipped (not product failures):")
        print("\n".join(skips))


if __name__ == "__main__":
    main()
