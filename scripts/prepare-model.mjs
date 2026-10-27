import { prepareModel,embedReport,modelId,modelRevision } from '../src/lib/semantic/model.ts';
await prepareModel();
await embedReport('Elevator is not working','The lift does not respond to calls.');
console.log(`Semantic model prepared: ${modelId}@${modelRevision}. Private report text stays on this server.`);
