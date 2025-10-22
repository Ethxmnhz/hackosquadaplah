const fs = require('fs');

// Read the complete export
const exportData = JSON.parse(fs.readFileSync('complete_supabase_export.json', 'utf8'));

// Function to escape SQL strings
function escapeSqlString(str) {
    if (str === null || str === undefined) {
        return 'NULL';
    }
    if (typeof str === 'string') {
        return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
    }
    if (typeof str === 'boolean') {
        return str ? 'TRUE' : 'FALSE';
    }
    if (str instanceof Date || (typeof str === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str))) {
        return `'${str}'`;
    }
    if (typeof str === 'object') {
        return `'${JSON.stringify(str).replace(/'/g, "''")}'`;
    }
    return str;
}

// Function to generate CREATE TABLE statements (basic structure)
function generateCreateTable(tableName, sampleRecord) {
    if (!sampleRecord || Object.keys(sampleRecord).length === 0) {
        return `-- No data available for table: ${tableName}\n\n`;
    }
    
    let sql = `-- Create table: ${tableName}\n`;
    sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    
    const columns = Object.keys(sampleRecord).map(key => {
        const value = sampleRecord[key];
        let type = 'TEXT';
        
        // Infer types from sample data
        if (key === 'id' || key.endsWith('_id')) {
            type = 'UUID';
        } else if (key.includes('created_at') || key.includes('updated_at') || key.includes('_at')) {
            type = 'TIMESTAMP WITH TIME ZONE';
        } else if (typeof value === 'number') {
            type = Number.isInteger(value) ? 'INTEGER' : 'DECIMAL';
        } else if (typeof value === 'boolean') {
            type = 'BOOLEAN';
        } else if (typeof value === 'object' && value !== null) {
            type = 'JSONB';
        }
        
        return `    ${key} ${type}`;
    });
    
    sql += columns.join(',\n');
    
    // Add primary key if id field exists
    if (Object.keys(sampleRecord).includes('id')) {
        sql += ',\n    PRIMARY KEY (id)';
    }
    
    sql += '\n);\n\n';
    
    return sql;
}

// Function to generate INSERT statements
function generateInserts(tableName, records) {
    if (!records || records.length === 0) {
        return `-- No records to insert for table: ${tableName}\n\n`;
    }
    
    let sql = `-- Insert data into: ${tableName}\n`;
    
    const columns = Object.keys(records[0]);
    const columnList = columns.join(', ');
    
    sql += `INSERT INTO ${tableName} (${columnList}) VALUES\n`;
    
    const valueRows = records.map(record => {
        const values = columns.map(col => escapeSqlString(record[col]));
        return `    (${values.join(', ')})`;
    });
    
    sql += valueRows.join(',\n');
    sql += '\nON CONFLICT (id) DO UPDATE SET\n';
    
    const updateSet = columns
        .filter(col => col !== 'id')
        .map(col => `    ${col} = EXCLUDED.${col}`)
        .join(',\n');
    
    sql += updateSet;
    sql += ';\n\n';
    
    return sql;
}

// Generate complete SQL dump
let sqlDump = `-- Supabase Data Export SQL Dump
-- Generated on: ${new Date().toISOString()}
-- Total tables: ${Object.keys(exportData).length}
-- 
-- This file contains the schema and data from your Supabase database
-- You can run this on any PostgreSQL server to recreate your data

BEGIN;

-- Disable foreign key checks during import
SET session_replication_role = replica;

`;

// Process each table
Object.keys(exportData).forEach(tableName => {
    const records = exportData[tableName];
    console.log(`Processing table: ${tableName} (${records.length} records)`);
    
    if (records.length > 0) {
        // Generate CREATE TABLE
        sqlDump += generateCreateTable(tableName, records[0]);
        
        // Generate INSERT statements
        sqlDump += generateInserts(tableName, records);
    } else {
        sqlDump += `-- Table ${tableName} is empty\n\n`;
    }
});

sqlDump += `
-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

COMMIT;

-- Export completed successfully
-- Total records exported: ${Object.values(exportData).reduce((sum, records) => sum + records.length, 0)}
`;

// Write SQL dump file
fs.writeFileSync('supabase_migration.sql', sqlDump);

console.log('✓ SQL dump generated: supabase_migration.sql');
console.log(`✓ Total records: ${Object.values(exportData).reduce((sum, records) => sum + records.length, 0)}`);
console.log('✓ Ready for PostgreSQL import!');

// Also create a README with instructions
const readme = `# Supabase to PostgreSQL Migration Files

Generated on: ${new Date().toISOString()}

## Files Created:

1. **complete_supabase_export.json** - Complete data export in JSON format
2. **supabase_migration.sql** - SQL dump ready for PostgreSQL import
3. **export_summary.json** - Export statistics and summary
4. Individual table exports: export_[table_name].json

## Tables Exported:

${Object.keys(exportData).map(table => `- ${table}: ${exportData[table].length} records`).join('\n')}

## How to Import to PostgreSQL:

### Option 1: Using psql command line
\`\`\`bash
psql -h your-postgres-host -U your-username -d your-database -f supabase_migration.sql
\`\`\`

### Option 2: Using pgAdmin
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on your database → Query Tool
4. Open the supabase_migration.sql file
5. Execute the script

### Option 3: Copy to cloud PostgreSQL services

**Railway:**
\`\`\`bash
railway connect
psql < supabase_migration.sql
\`\`\`

**Neon:**
\`\`\`bash
psql "postgresql://username:password@your-neon-host/dbname" < supabase_migration.sql
\`\`\`

**Supabase (different project):**
\`\`\`bash
psql "postgresql://postgres:[SERVICE_ROLE_KEY]@db.your-project.supabase.co:5432/postgres" < supabase_migration.sql
\`\`\`

## Next Steps:

1. Set up your new PostgreSQL server (Railway, Neon, DigitalOcean, AWS RDS, etc.)
2. Run the supabase_migration.sql script to import all data
3. Update your application's database connection string
4. Test that all data imported correctly
5. Update any Supabase-specific features (Auth, RLS policies, etc.)

## Notes:

- All tables will be created with basic column types inferred from your data
- UPSERT functionality is included (ON CONFLICT DO UPDATE)
- Foreign key constraints may need to be added manually after import
- Row Level Security (RLS) policies are not included and need to be recreated
- Supabase Auth users are not included (that's handled separately)

Total records exported: ${Object.values(exportData).reduce((sum, records) => sum + records.length, 0)}
`;

fs.writeFileSync('MIGRATION_README.md', readme);
console.log('✓ Migration instructions created: MIGRATION_README.md');