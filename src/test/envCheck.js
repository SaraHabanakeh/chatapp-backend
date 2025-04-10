import 'dotenv/config';

console.log('Checking environment variables...');
console.log('DB_PASS:', process.env.DB_PASS ? '✓ Set' : '✗ Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set (will use production)');

if (!process.env.DB_PASS) {
    console.error('\nError: DB_PASS environment variable is not set!');
    console.log('Please make sure you have a .env file in your project root with the following content:');
    console.log(`
DB_PASS=your_mongodb_password
NODE_ENV=development    # Optional
`);
} 