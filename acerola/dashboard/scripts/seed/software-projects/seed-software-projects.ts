import { sql } from 'drizzle-orm';

import { type DatabaseExecutor } from '../../../server/src/lib/db/db.type';
import { softwareProjects } from '../../../server/src/lib/db/schema/software-projects.schema';
import { softwareScheduleEvents } from '../../../server/src/lib/db/schema/software-schedule-events.schema';
import { softwareTimelineEvents } from '../../../server/src/lib/db/schema/software-timeline-events.schema';
import { openSeedDatabase, report } from '../seed.util';
import {
  getScheduleSeed,
  SOFTWARE_PROJECTS_SEED,
  SOFTWARE_TIMELINE_SEED,
} from './software-projects.data';

export async function seedSoftwareProjects(db: DatabaseExecutor): Promise<number> {
  await db
    .insert(softwareProjects)
    .values(SOFTWARE_PROJECTS_SEED)
    .onConflictDoNothing({ target: softwareProjects.id });

  if (SOFTWARE_TIMELINE_SEED.length > 0) {
    await db
      .insert(softwareTimelineEvents)
      .values(SOFTWARE_TIMELINE_SEED)
      .onConflictDoNothing({ target: softwareTimelineEvents.id });
  }

  const scheduleEvents = getScheduleSeed();
  await db
    .insert(softwareScheduleEvents)
    .values(scheduleEvents)
    .onConflictDoNothing({ target: softwareScheduleEvents.id });

  await syncIdSequences(db);

  return SOFTWARE_PROJECTS_SEED.length;
}

async function syncIdSequences(db: DatabaseExecutor): Promise<void> {
  await db.execute(
    sql`select setval(pg_get_serial_sequence('software_projects', 'id'), coalesce((select max(id) from software_projects), 0) + 1, false)`,
  );
  await db.execute(
    sql`select setval(pg_get_serial_sequence('software_timeline_events', 'id'), coalesce((select max(id) from software_timeline_events), 0) + 1, false)`,
  );
  await db.execute(
    sql`select setval(pg_get_serial_sequence('software_schedule_events', 'id'), coalesce((select max(id) from software_schedule_events), 0) + 1, false)`,
  );
}

if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('sistemas e projetos', await seedSoftwareProjects(db));
    } finally {
      await close();
    }
  });
}
