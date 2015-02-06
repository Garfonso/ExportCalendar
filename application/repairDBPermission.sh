#!/bin/bash
#
luna-send -a com.palm.app.calendar -n 1 palm://com.palm.db/putPermissions '{"permissions": [{"type": "db.kind", "object": "com.palm.calendarevent:1", "caller": "info.mobo.*", "operations": {"read":"allow"}}]}'
