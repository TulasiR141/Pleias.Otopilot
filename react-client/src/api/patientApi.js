// src/api/patientApi.js
export async function createPatient(patientData) {
  const response = await fetch('http://localhost:5154/api/patient', {
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
