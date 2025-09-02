namespace AudiologyChatBot.Core.Models
{
    public class PatientModel
    {
        public int Id { get; set; }
        public int NOAHPatientId { get; set; }
        public Guid NOAHPatientGUID { get; set; }
        public string? NOAHPatientNumber { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? MiddleName { get; set; }
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public bool ActivePatient { get; set; }
        public string? CreatedBy { get; set; }
        public int? UserId { get; set; }
        public DateTime CreatedDate { get; set; }
        public List<PatientActionModel> Actions { get; set; } = new();
    }

    public class PatientActionModel
    {
        public int Id { get; set; }
        public int PatientId { get; set; }
        public string? TypeOfData { get; set; }
        public string? Description { get; set; }
        public DateTime ActionDate { get; set; }
        public DateTime LastModifiedDate { get; set; }
        public string? PublicDataXML { get; set; }
        public List<AudiogramModel> Audiograms { get; set; } = new();
        public List<HearingInstrumentModel> HearingInstruments { get; set; } = new();
        public List<TinnitusMeasurementModel> TinnitusMeasurements { get; set; } = new();
        public List<HearingInstrumentFittingModel> HearingInstrumentFittings { get; set; } = new();
    }

    public class AudiogramModel
    {
        public int Id { get; set; }
        public int PatientId { get; set; }
        public int ActionId { get; set; }
        public DateTime TestDate { get; set; }
        public string? TestType { get; set; }
        public string? Ear { get; set; }
        public List<ToneThresholdPointModel> TonePoints { get; set; } = new();
        public List<SpeechDiscriminationPointModel> SpeechPoints { get; set; } = new();
    }

    public class ToneThresholdPointModel
    {
        public int Id { get; set; }
        public int AudiogramId { get; set; }
        public int StimulusFrequency { get; set; }
        public decimal StimulusLevel { get; set; }
        public int? MaskingFrequency { get; set; }
        public decimal? MaskingLevel { get; set; }
        public string? TonePointStatus { get; set; }
    }

    public class SpeechDiscriminationPointModel
    {
        public int Id { get; set; }
        public int AudiogramId { get; set; }
        public decimal StimulusLevel { get; set; }
        public decimal ScorePercent { get; set; }
        public int NumberOfWords { get; set; }
        public string? SpeechPointStatus { get; set; }
    }

    public class HearingInstrumentModel
    {
        public int Id { get; set; }
        public int PatientId { get; set; }
        public int ActionId { get; set; }
        public string? InstrumentTypeName { get; set; }
        public string? SerialNumber { get; set; }
        public string? Ear { get; set; }
        public DateTime SelectionDate { get; set; }
    }

    public class TinnitusMeasurementModel
    {
        public int Id { get; set; }
        public int PatientId { get; set; }
        public int ActionId { get; set; }
        public DateTime TestDate { get; set; }
        public string MeasurementType { get; set; } = string.Empty; // 'PitchMatch', 'LoudnessMatch'
        public string Ear { get; set; } = string.Empty; // 'Left', 'Right'
        public int? StimulusFrequency { get; set; }
        public decimal? StimulusIntensity { get; set; }
        public string? StimulusUnit { get; set; }
        public int? MaskingFrequency { get; set; }
        public decimal? MaskingIntensity { get; set; }
        public string? MaskingUnit { get; set; }
        public string? StimulusSignalType { get; set; }
        public string? MaskingSignalType { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    }

    public class HearingInstrumentFittingModel
    {
        public int Id { get; set; }
        public int HearingInstrumentId { get; set; }
        public int PatientId { get; set; }
        public int ActionId { get; set; }
        public DateTime FittingDate { get; set; }
        public string? FittingNotes { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    }
}