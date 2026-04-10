// Test file to verify Auth0 configuration
// This file helps debug Auth0 setup issues

export function checkAuth0Config() {
  const required = [
    'AUTH0_SECRET',
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
  ];

  const optional = [
    'AUTH0_AUDIENCE',
    'AUTH0_SCOPE',
  ];

  console.log('🔍 Checking Auth0 Configuration...\n');

  let hasErrors = false;

  required.forEach(key => {
    const value = process.env[key];
    if (!value) {
      console.error(`❌ Missing required: ${key}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${key}: ${value.substring(0, 20)}...`);
    }
  });

  console.log('\nOptional configuration:');
  optional.forEach(key => {
    const value = process.env[key];
    if (value) {
      console.log(`✅ ${key}: ${value}`);
    } else {
      console.log(`⚠️  ${key}: not set (using defaults)`);
    }
  });

  if (hasErrors) {
    console.error('\n❌ Configuration errors found. Please check your .env.local file');
    return false;
  } else {
    console.log('\n✅ Auth0 configuration looks good!');
    return true;
  }
}

// Auto-run in development
if (process.env.NODE_ENV === 'development') {
  checkAuth0Config();
}
