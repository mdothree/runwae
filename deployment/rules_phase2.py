#!/usr/bin/env python3
"""RW-SEC-03 phase 2 rules: run ONLY after MIGRATE.sh has moved every user's private
fields to users_private/{uid} and removed them from users/{uid}.

Reads database.rules.json (phase 1: users_private live, legacy users/{uid} private
fields still accepted so stale cached clients keep working during the rollout) and
writes database.rules.phase2.json:
  - users/{uid}/{email,email_prefs,customer_id,conversations,notifications,transactions}
    can no longer hold data (.validate false), so nothing private is ever written
    under the world-readable users/ tree again;
  - conversations/{c} membership checks only users_private (legacy index dropped).

Usage: python3 deployment/rules_phase2.py [in] [out]
The committed database.rules.phase2.json must equal this script's output
(tests/security/rules-phase2.test.js and MIGRATE.sh check that).
"""
import json, sys

src = sys.argv[1] if len(sys.argv) > 1 else 'database.rules.json'
dst = sys.argv[2] if len(sys.argv) > 2 else 'database.rules.phase2.json'
rules = json.load(open(src))
r = rules['rules']

def idx(loc, uid_expr):
    return f"root.child('{loc}').child({uid_expr}).child('conversations').child($c).child('uid')"

def member(locs):
    parts = []
    for mine in locs:
        my = idx(mine, 'auth.uid')
        partner = " || ".join(f"{idx(pl, my + '.val()')}.val() === auth.uid" for pl in locs)
        parts.append(f"({my}.isString() && ({partner}))")
    return "(" + " || ".join(parts) + ")"

M1, M2 = member(['users_private', 'users']), member(['users_private'])
c = r['conversations']['$c']
assert M1 in c['.read'] and M1 in c['$m']['.write'], 'phase-1 membership expression not found'
c['.read'] = c['.read'].replace(M1, M2)
c['$m']['.write'] = c['$m']['.write'].replace(M1, M2)

u = r['users']['$uid']
for f in ('email', 'email_prefs', 'customer_id', 'conversations', 'notifications', 'transactions'):
    u[f] = {'.validate': False}

with open(dst, 'w') as fh:
    json.dump(rules, fh, indent=2)
    fh.write('\n')
print(f'wrote {dst}')
