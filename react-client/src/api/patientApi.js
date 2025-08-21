// src/api/patientApi.js
export async function createPatient(patientData) {
  const response = await fetch('https://audiologychatbot-api-tulasi.azurewebsites.net/api/patient', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(patientData)
  });

  if (!response.ok) {
    throw new Error('Failed to create patient');
  }

  return await response.json();
}
