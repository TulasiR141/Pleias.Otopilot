using AudiologyChatBot.Core.Interfaces;
using AudiologyChatBot.Core.Models;
using System.Xml.Linq;

namespace AudiologyChatBot.Infrastructure.Services
{
    public class DataImportService : IDataImportService
    {
        private readonly IDataImportRepository _repository;

        public DataImportService(IDataImportRepository repository)
        {
            _repository = repository;
        }

        public async Task ImportXmlDataAsync(string xmlContent)
        {
            var xDoc = XDocument.Parse(xmlContent);

            // Define namespaces based on actual XML structure
            XNamespace pt = "http://www.himsa.com/Measurement/PatientExport.xsd";

            // Parse patients from correct structure - get the inner Patient elements
            var patientElements = xDoc.Descendants(pt + "Patient")
                .Where(p => p.Parent?.Name.LocalName == "Patient");

            foreach (var patientElement in patientElements)
            {
                try
                {
                    var patient = ParsePatient(patientElement, pt);
                    await ProcessPatientAsync(patient);
                }
                catch (Exception ex)
                {
                    // Log error but continue with other patients
                    Console.WriteLine($"Error processing patient {patientElement.Element(pt + "FirstName")?.Value}: {ex.Message}");
                    continue;
                }
            }
        }

        private PatientModel ParsePatient(XElement patientElement, XNamespace pt)
        {
            var patient = new PatientModel
            {
                NOAHPatientId = (int?)patientElement.Element(pt + "NOAHPatientId") ?? 0,
                NOAHPatientGUID = Guid.Parse((string)patientElement.Element(pt + "NOAHPatientGUID")),
                NOAHPatientNumber = (string?)patientElement.Element(pt + "NOAHPatientNumber"),
                FirstName = (string?)patientElement.Element(pt + "FirstName"),
                LastName = (string?)patientElement.Element(pt + "LastName"),
                MiddleName = (string?)patientElement.Element(pt + "MiddleName"),
                Gender = (string?)patientElement.Element(pt + "Gender"),
                DateOfBirth = DateTime.TryParse((string?)patientElement.Element(pt + "DateofBirth"), out var dob) ? dob : (DateTime?)null,
                CreatedBy = (string?)patientElement.Element(pt + "CreatedBy"),
                UserId = (int?)patientElement.Element(pt + "UserId"),
                CreatedDate = DateTime.TryParse((string?)patientElement.Element(pt + "CreateDate"), out var cd) ? cd : DateTime.Now,
                ActivePatient = ((string?)patientElement.Element(pt + "ActivePatient")) == "1",
                Actions = new List<PatientActionModel>()
            };

            // Parse actions
            var actionsElement = patientElement.Element(pt + "Actions");
            if (actionsElement != null)
            {
                foreach (var actionElement in actionsElement.Elements(pt + "Action"))
                {
                    var action = ParseAction(actionElement, pt);
                    patient.Actions.Add(action);
                }
            }

            return patient;
        }

        private PatientActionModel ParseAction(XElement actionElement, XNamespace pt)
        {
            var action = new PatientActionModel
            {
                TypeOfData = (string?)actionElement.Element(pt + "TypeOfData"),
                Description = (string?)actionElement.Element(pt + "Description"),
                ActionDate = DateTime.Parse((string)actionElement.Element(pt + "ActionDate")),
                LastModifiedDate = DateTime.Parse((string)actionElement.Element(pt + "LastModifiedDate")),
                PublicDataXML = actionElement.Element(pt + "PublicData")?.ToString(),
                Audiograms = new List<AudiogramModel>(),
                HearingInstruments = new List<HearingInstrumentModel>(),
                TinnitusMeasurements = new List<TinnitusMeasurementModel>(),
                HearingInstrumentFittings = new List<HearingInstrumentFittingModel>()
            };

            // Parse different types of data based on TypeOfData and PublicData content
            var publicDataElement = actionElement.Element(pt + "PublicData");
            if (publicDataElement != null && publicDataElement.HasElements)
            {
                ParsePublicData(action, publicDataElement);
            }

            return action;
        }

        private void ParsePublicData(PatientActionModel action, XElement publicDataElement)
        {
            // Parse Audiogram data
            var audiometricStandard = publicDataElement.Elements().FirstOrDefault(e => e.Name.LocalName == "HIMSAAudiometricStandard");
            if (audiometricStandard != null)
            {
                ParseAudiometricData(action, audiometricStandard);
            }

            // Parse Hearing Instrument Selection
            var instrumentSelection = publicDataElement.Elements().FirstOrDefault(e => e.Name.LocalName == "HearingInstrumentSelection");
            if (instrumentSelection != null)
            {
                ParseHearingInstrumentSelection(action, instrumentSelection);
            }

            // Parse Hearing Instrument Fitting
            var instrumentFitting = publicDataElement.Elements().FirstOrDefault(e => e.Name.LocalName == "HearingInstrumentFitting");
            if (instrumentFitting != null)
            {
                ParseHearingInstrumentFitting(action, instrumentFitting);
            }

            // Parse Tinnitus data
            var tinnitusData = publicDataElement.Elements().FirstOrDefault(e => e.Name.LocalName == "TinnitusMeasurementData");
            if (tinnitusData != null)
            {
                ParseTinnitusData(action, tinnitusData);
            }
        }

        private void ParseAudiometricData(PatientActionModel action, XElement audiometricStandard)
        {
            var ns = audiometricStandard.Name.Namespace;

            // Parse Tone Threshold Audiograms
            foreach (var toneAudiogram in audiometricStandard.Elements(ns + "ToneThresholdAudiogram"))
            {
                var audiogram = new AudiogramModel
                {
                    TestDate = action.ActionDate,
                    TestType = "ToneThreshold",
                    Ear = DetermineEarFromConditions(toneAudiogram, ns),
                    TonePoints = new List<ToneThresholdPointModel>(),
                    SpeechPoints = new List<SpeechDiscriminationPointModel>()
                };

                // Parse tone points
                foreach (var tonePoint in toneAudiogram.Elements(ns + "TonePoints"))
                {
                    var point = new ToneThresholdPointModel
                    {
                        StimulusFrequency = (int)tonePoint.Element(ns + "StimulusFrequency"),
                        StimulusLevel = (decimal)tonePoint.Element(ns + "StimulusLevel"),
                        MaskingFrequency = (int?)tonePoint.Element(ns + "MaskingFrequency"),
                        MaskingLevel = (decimal?)tonePoint.Element(ns + "MaskingLevel"),
                        TonePointStatus = (string?)tonePoint.Element(ns + "TonePointStatus")
                    };
                    audiogram.TonePoints.Add(point);
                }

                action.Audiograms.Add(audiogram);
            }

            // Parse Speech Discrimination Audiograms
            foreach (var speechAudiogram in audiometricStandard.Elements(ns + "SpeechDiscriminationAudiogram"))
            {
                var audiogram = new AudiogramModel
                {
                    TestDate = action.ActionDate,
                    TestType = "SpeechDiscrimination",
                    Ear = DetermineEarFromConditions(speechAudiogram, ns),
                    TonePoints = new List<ToneThresholdPointModel>(),
                    SpeechPoints = new List<SpeechDiscriminationPointModel>()
                };

                // Parse speech points
                foreach (var speechPoint in speechAudiogram.Elements(ns + "SpeechDiscriminationPoints"))
                {
                    var point = new SpeechDiscriminationPointModel
                    {
                        StimulusLevel = (decimal)speechPoint.Element(ns + "StimulusLevel"),
                        ScorePercent = (decimal)speechPoint.Element(ns + "ScorePercent"),
                        NumberOfWords = (int)speechPoint.Element(ns + "NumberOfWords"),
                        SpeechPointStatus = (string?)speechPoint.Element(ns + "SpeechPointStatus")
                    };
                    audiogram.SpeechPoints.Add(point);
                }

                action.Audiograms.Add(audiogram);
            }
        }

        private void ParseHearingInstrumentSelection(PatientActionModel action, XElement instrumentSelection)
        {
            var ns = instrumentSelection.Name.Namespace;

            var instrument = new HearingInstrumentModel
            {
                InstrumentTypeName = (string?)instrumentSelection.Element(ns + "InstrumentTypeName"),
                SerialNumber = (string?)instrumentSelection.Element(ns + "SerialNumber"),
                Ear = DetermineEarFromDescription(action.Description),
                SelectionDate = action.ActionDate
            };

            action.HearingInstruments.Add(instrument);
        }

        private void ParseHearingInstrumentFitting(PatientActionModel action, XElement instrumentFitting)
        {
            var fitting = new HearingInstrumentFittingModel
            {
                FittingDate = action.ActionDate,
                FittingNotes = action.Description
            };

            action.HearingInstrumentFittings.Add(fitting);
        }

        private void ParseTinnitusData(PatientActionModel action, XElement tinnitusData)
        {
            var ns = tinnitusData.Name.Namespace;

            // Parse Pitch Match
            var pitchMatch = tinnitusData.Element(ns + "TinnitusPitchMatch");
            if (pitchMatch != null)
            {
                var measurementPoint = pitchMatch.Element(ns + "MeasurementPoint");
                if (measurementPoint != null)
                {
                    var tinnitus = new TinnitusMeasurementModel
                    {
                        TestDate = action.ActionDate,
                        MeasurementType = "PitchMatch",
                        Ear = DetermineEarFromTinnitusConditions(pitchMatch, ns),
                        StimulusFrequency = (int?)measurementPoint.Element(ns + "StimulusFrequency"),
                        StimulusIntensity = ExtractIntensityValue(measurementPoint.Element(ns + "StimulusIntensity")),
                        StimulusUnit = ExtractIntensityUnit(measurementPoint.Element(ns + "StimulusIntensity")),
                        MaskingFrequency = (int?)measurementPoint.Element(ns + "MaskingFrequency"),
                        MaskingIntensity = ExtractIntensityValue(measurementPoint.Element(ns + "MaskingIntensity"))
                    };
                    action.TinnitusMeasurements.Add(tinnitus);
                }
            }

            // Parse Loudness Match
            var loudnessMatch = tinnitusData.Element(ns + "TinnitusLoudnessMatch");
            if (loudnessMatch != null)
            {
                var measurementPoint = loudnessMatch.Element(ns + "MeasurementPoint");
                if (measurementPoint != null)
                {
                    var tinnitus = new TinnitusMeasurementModel
                    {
                        TestDate = action.ActionDate,
                        MeasurementType = "LoudnessMatch",
                        Ear = DetermineEarFromTinnitusConditions(loudnessMatch, ns),
                        StimulusFrequency = (int?)measurementPoint.Element(ns + "StimulusFrequency"),
                        StimulusIntensity = ExtractIntensityValue(measurementPoint.Element(ns + "StimulusIntensity")),
                        StimulusUnit = ExtractIntensityUnit(measurementPoint.Element(ns + "StimulusIntensity")),
                        MaskingFrequency = (int?)measurementPoint.Element(ns + "MaskingFrequency"),
                        MaskingIntensity = ExtractIntensityValue(measurementPoint.Element(ns + "MaskingIntensity"))
                    };
                    action.TinnitusMeasurements.Add(tinnitus);
                }
            }
        }

        private async Task ProcessPatientAsync(PatientModel patient)
        {
            // Upsert patient (this handles the delete and insert logic in repository)
            var patientId = await _repository.UpsertPatientAsync(patient);

            // Process each action
            foreach (var action in patient.Actions)
            {
                var actionId = await _repository.InsertActionAsync(patientId, action);

                // Process audiograms
                foreach (var audiogram in action.Audiograms)
                {
                    var audiogramId = await _repository.InsertAudiogramAsync(patientId, actionId, audiogram);

                    // Insert tone threshold points
                    foreach (var tonePoint in audiogram.TonePoints)
                    {
                        await _repository.InsertToneThresholdPointAsync(audiogramId, tonePoint);
                    }

                    // Insert speech discrimination points
                    foreach (var speechPoint in audiogram.SpeechPoints)
                    {
                        await _repository.InsertSpeechDiscriminationPointAsync(audiogramId, speechPoint);
                    }
                }

                // Process tinnitus measurements
                foreach (var tinnitus in action.TinnitusMeasurements)
                {
                    await _repository.InsertTinnitusMeasurementAsync(patientId, actionId, tinnitus);
                }

                // Process hearing instruments
                foreach (var instrument in action.HearingInstruments)
                {
                    var instrumentId = await _repository.InsertHearingInstrumentAsync(patientId, actionId, instrument);

                    // Process associated fittings
                    foreach (var fitting in action.HearingInstrumentFittings)
                    {
                        await _repository.InsertHearingInstrumentFittingAsync(patientId, actionId, instrumentId, fitting);
                    }
                }
            }
        }

        #region Helper Methods

        private string DetermineEarFromConditions(XElement audiogram, XNamespace ns)
        {
            var conditions = audiogram.Element(ns + "AudMeasurementConditions");
            if (conditions != null)
            {
                var stimulusOutput = (string?)conditions.Element(ns + "StimulusSignalOutput");
                if (stimulusOutput != null)
                {
                    if (stimulusOutput.Contains("Right")) return "Right";
                    if (stimulusOutput.Contains("Left")) return "Left";
                    if (stimulusOutput.Contains("Binaural")) return "Both";
                }
            }
            return "Unknown";
        }

        private string DetermineEarFromDescription(string? description)
        {
            if (string.IsNullOrEmpty(description)) return "Unknown";

            description = description.ToLower();
            if (description.Contains("right") || description.Contains("droit")) return "Right";
            if (description.Contains("left") || description.Contains("gauche")) return "Left";
            return "Unknown";
        }

        private string DetermineEarFromTinnitusConditions(XElement tinnitusElement, XNamespace ns)
        {
            var conditions = tinnitusElement.Element(ns + "MeasurementConditions");
            if (conditions != null)
            {
                var stimulusOutput = (string?)conditions.Element(ns + "StimulusSignalOutput");
                if (stimulusOutput != null)
                {
                    if (stimulusOutput.Contains("Right")) return "Right";
                    if (stimulusOutput.Contains("Left")) return "Left";
                }
            }
            return "Unknown";
        }

        private decimal? ExtractIntensityValue(XElement? intensityElement)
        {
            if (intensityElement == null) return null;
            var intensityValue = intensityElement.Element(intensityElement.Name.Namespace + "Intensity");
            return (decimal?)intensityValue;
        }

        private string? ExtractIntensityUnit(XElement? intensityElement)
        {
            if (intensityElement == null) return null;
            var unitValue = intensityElement.Element(intensityElement.Name.Namespace + "Unit");
            return (string?)unitValue;
        }

        #endregion
    }
}