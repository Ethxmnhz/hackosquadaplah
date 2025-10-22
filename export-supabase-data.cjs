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
                    resolve(JSON.parse(data));
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

// Function to get table names
async function getTables() {
    const options = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        }
    };
    
    try {
        // Get schema information via PostgREST
        const response = await makeRequest(`${SUPABASE_URL}/rest/v1/`, options);
        console.log('Available endpoints:', response);
        return response;
    } catch (error) {
        console.error('Error fetching tables:', error);
        return null;
    }
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
        
        // Write to JSON file
        fs.writeFileSync(`${tableName}_export.json`, JSON.stringify(data, null, 2));
        console.log(`✓ Exported ${data.length} records from ${tableName}`);
        
        return data;
    } catch (error) {
        console.error(`Error exporting ${tableName}:`, error.message);
        return null;
    }
}

// Main function
async function main() {
    console.log('Starting Supabase data export...');
    
    // Try to export common tables
    const commonTables = [
        'users',
        'profiles', 
        'posts',
        'comments',
        'categories',
        'tags',
        'settings',
        'permissions',
        'roles'
    ];
    
    const exportedData = {};
    
    for (const table of commonTables) {
        const data = await exportTable(table);
        if (data) {
            exportedData[table] = data;
        }
    }
    
    // Write complete export
    fs.writeFileSync('complete_export.json', JSON.stringify(exportedData, null, 2));
    console.log('✓ Complete export saved to complete_export.json');
    
    console.log('Export completed!');
}

// Run the export
main().catch(console.error);