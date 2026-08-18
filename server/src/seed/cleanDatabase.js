import 'dotenv/config';
import { resetToCleanProduction } from '../config/initCleanDatabase.js';

resetToCleanProduction();
console.log('✅ Database successfully purged of all test/demo transactions.');
process.exit(0);
