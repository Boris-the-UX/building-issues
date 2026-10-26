import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import ts from 'typescript';

// Buffer output first so a failed CLI command never truncates the checked-in types.
const source = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'gen', 'types', 'typescript', '--local', '--schema', 'public'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
if (!source.includes('export type Database')) throw new Error('Supabase returned no database types.');
const file = ts.createSourceFile('database.types.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const formatted = '// Generated from the local schema. Run npm run db:types after migrations.\n' + ts.createPrinter().printFile(file);
writeFileSync('src/lib/supabase/database.types.ts', formatted);
console.log('Updated Supabase database types.');
