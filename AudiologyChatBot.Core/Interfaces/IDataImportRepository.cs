using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Core.Interfaces
{
    public interface IDataImportRepository
    {
        Task<(int patientId, bool wasExisting)> UpsertPatientAsync(PatientModel patient);
        Task<int> InsertActionAsync(int patientId, PatientActionModel action);
        Task<int> InsertAudiogramAsync(int patientId, int actionId, AudiogramModel audiogram);
        Task InsertToneThresholdPointAsync(int audiogramId, ToneThresholdPointModel tonePoint);
        Task InsertSpeechDiscriminationPointAsync(int audiogramId, SpeechDiscriminationPointModel speechPoint);
        Task InsertTinnitusMeasurementAsync(int patientId, int actionId, TinnitusMeasurementModel tinnitus);
        Task<int> InsertHearingInstrumentAsync(int patientId, int actionId, HearingInstrumentModel instrument);
        Task InsertHearingInstrumentFittingAsync(int patientId, int actionId, int instrumentId, HearingInstrumentFittingModel fitting);
    }

}
