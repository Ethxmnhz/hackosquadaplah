const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://knkmwdvodbonkbglwyqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtua213ZHZvZGJvbmtiZ2x3eXF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYzMDkxMSwiZXhwIjoyMDY0MjA2OTExfQ.prWywtPbiZzCkFwx58E4Tfns5Z0HDVsyDHJRYbauwt8';

// Function to make HTTP requests
function makeRequest(url, options) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data); // Return raw data if not JSON
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// Function to execute SQL query
async function executeSql(query) {
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    };
    
    try {
        return await makeRequest(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, options);
    } catch (error) {
        console.error('SQL execution failed, trying alternative method...');
        return null;
    }
}

// Function to discover tables
async function discoverTables() {
    console.log('Discovering tables...');
    
    // Get tables from information_schema
    const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `;
    
    try {
        const result = await executeSql(query);
        if (result && result.length > 0) {
            return result.map(row => row.table_name);
        }
    } catch (error) {
        console.log('Could not query information_schema, trying manual discovery...');
    }
    
    // Fallback: try common table names from your project
    const commonTables = [
        'profiles', 'tags', 'users', 'courses', 'lessons', 'progress',
        'certificates', 'skill_paths', 'assessments', 'submissions',
        'badges', 'achievements', 'notifications', 'settings',
        'content', 'media', 'categories', 'topics', 'questions',
        'answers', 'ratings', 'reviews', 'comments', 'posts',
        'labs', 'lab_instances', 'lab_sessions', 'equipment',
        'bookings', 'payments', 'subscriptions', 'vouchers',
        'entitlements', 'access_logs', 'audit_logs', 'events'
    ];
    
    const existingTables = [];
    
    for (const table of commonTables) {
        try {
            console.log(`Testing table: ${table}`);
            const options = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Content-Type': 'application/json',
                    'Range': '0-0' // Just get first row to test existence
                }
            };
            
            await makeRequest(`${SUPABASE_URL}/rest/v1/${table}`, options);
            existingTables.push(table);
            console.log(`✓ Found table: ${table}`);
        } catch (error) {
            if (error.message.includes('404')) {
                console.log(`  - Table ${table} does not exist`);
            } else {
                console.log(`  ? Could not access ${table}: ${error.message}`);
                // Still add it, might be permissions issue
                existingTables.push(table);
            }
        }
    }
    
    return existingTables;
}

// Function to export data from a table
async function exportTable(tableName) {
    const options = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        }
    };
    
    try {
        console.log(`Exporting table: ${tableName}`);
        const data = await makeRequest(`${SUPABASE_URL}/rest/v1/${tableName}`, options);
        
        if (data && data.length > 0) {
            // Write to JSON file
            fs.writeFileSync(`export_${tableName}.json`, JSON.stringify(data, null, 2));
            console.log(`✓ Exported ${data.length} records from ${tableName}`);
            return data;
        } else {
            console.log(`  - Table ${tableName} is empty`);
            return [];
        }
    } catch (error) {
        console.error(`Error exporting ${tableName}:`, error.message);
        return null;
    }
}

// Main function
async function main() {
    console.log('Starting comprehensive Supabase data export...');
    console.log('===============================================');
    
    // Discover all tables
    const tables = await discoverTables();
    
    console.log(`\nFound ${tables.length} tables to export:`);
    tables.forEach(table => console.log(`  - ${table}`));
    
    console.log('\nStarting data export...');
    console.log('=======================');
    
    const exportedData = {};
    const exportStats = {};
    
    for (const table of tables) {
        const data = await exportTable(table);
        if (data !== null) {
            exportedData[table] = data;
            exportStats[table] = Array.isArray(data) ? data.length : 0;
        }
    }
    
    // Write complete export
    fs.writeFileSync('complete_supabase_export.json', JSON.stringify(exportedData, null, 2));
    
    // Write export summary
    const summary = {
        export_date: new Date().toISOString(),
        total_tables: tables.length,
        successful_exports: Object.keys(exportStats).length,
        table_stats: exportStats,
        total_records: Object.values(exportStats).reduce((sum, count) => sum + count, 0)
    };
    
    fs.writeFileSync('export_summary.json', JSON.stringify(summary, null, 2));
    
    console.log('\n===============================================');
    console.log('Export completed!');
    console.log('===============================================');
    console.log(`Total tables processed: ${tables.length}`);
    console.log(`Successful exports: ${Object.keys(exportStats).length}`);
    console.log(`Total records exported: ${summary.total_records}`);
    console.log('\nFiles created:');
    console.log('  - complete_supabase_export.json (all data)');
    console.log('  - export_summary.json (statistics)');
    Object.keys(exportStats).forEach(table => {
        if (exportStats[table] > 0) {
            console.log(`  - export_${table}.json (${exportStats[table]} records)`);
        }
    });
}

// Run the export
main().catch(console.error);