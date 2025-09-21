namespace AudiologyChatBot.Core.Models
{
    public class PatientModel
    {
        public int Id { get; set; }

        // NOAH system integration fields
        public int? NOAHPatientId { get; set; }
        public Guid? NOAHPatientGUID { get; set; }
        public string? NOAHPatientNumber { get; set; }

        // Personal information
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        public string Gender { get; set; } = string.Empty;
        public DateTime? DateOfBirth { get; set; }

        // Computed property - matches the computed column in database
        public int? Age => DateOfBirth.HasValue ?
            DateTime.Now.Year - DateOfBirth.Value.Year -
            (DateTime.Now.DayOfYear < DateOfBirth.Value.DayOfYear ? 1 : 0) : null;

        // Status and tracking
        public bool ActivePatient { get; set; } = true;
        public string? CreatedBy { get; set; }
        public int? UserId { get; set; }

        // Address information
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? Address3 { get; set; }
        public string? City { get; set; }
        public string? Province { get; set; }
        public string? Country { get; set; }
        public string? Zip { get; set; }

        // Contact information
        public string? Email { get; set; }
        public string? HomePhone { get; set; }
        public string? WorkPhone { get; set; }
        public string? MobilePhone { get; set; }

        // Insurance and medical information
        public string? Insurance1 { get; set; }
        public string? Insurance2 { get; set; }
        public string? Physician { get; set; }
        public string? Referral { get; set; }

        // Additional fields
        public string? Other1 { get; set; }
        public string? Other2 { get; set; }

        // Audit fields
        public DateTime CreatedDate { get; set; }
        public DateTime UpdatedDate { get; set; }

        // Existing property from your original model
        public List<PatientActionModel> Actions { get; set; } = new();

        // Computed properties for backward compatibility with old Patient model
        public string FullName => $"{FirstName} {LastName}".Trim();

        public string Address => string.Join(", ", new[] { Address1, Address2, Address3, City, Province, Country }
            .Where(x => !string.IsNullOrWhiteSpace(x)));

        public string Phone => MobilePhone ?? HomePhone ?? WorkPhone ?? string.Empty;

        // Helper method to set full name (parses into FirstName/LastName)
        public void SetFullName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName))
            {
                FirstName = "";
                LastName = "";
                return;
            }

            var nameParts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            FirstName = nameParts.Length > 0 ? nameParts[0] : fullName;
            LastName = nameParts.Length > 1 ? string.Join(" ", nameParts.Skip(1)) : "";
        }

        // Helper method to set address (parses into Address1, City, Province)
        public void SetAddress(string address)
        {
            if (string.IsNullOrWhiteSpace(address))
            {
                Address1 = Address2 = Address3 = City = Province = Country = null;
                return;
            }

            var addressParts = address.Split(',').Select(x => x.Trim()).Where(x => !string.IsNullOrEmpty(x)).ToArray();
            Address1 = addressParts.Length > 0 ? addressParts[0] : null;
            City = addressParts.Length > 1 ? addressParts[1] : null;
            Province = addressParts.Length > 2 ? addressParts[2] : null;
            Country = addressParts.Length > 3 ? addressParts[3] : null;
        }

        // Helper method to set primary phone
        public void SetPhone(string phone)
        {
            MobilePhone = !string.IsNullOrWhiteSpace(phone) ? phone : null;
        }
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
    public class ImportResultModel
    {
        public int NewPatients { get; set; } = 0;
        public int UpdatedPatients { get; set; } = 0;
        public int TotalRecords { get; set; } = 0;
        public int TotalActions { get; set; } = 0;
        public int FailedRecords { get; set; } = 0;
        public int ProcessingTimeMs { get; set; } = 0;
        public List<string> Warnings { get; set; } = new List<string>();
        public List<string> Errors { get; set; } = new List<string>();
    }
}