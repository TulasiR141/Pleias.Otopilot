using AudiologyChatBot.Core.Interfaces;
using AudiologyChatBot.Core.Models;
using AudiologyChatBot.Infrastructure.Services;
using AudiologyChatBot.Infrastructure.Repositories;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();

// Register repository with interfaces (Database layer)
builder.Services.AddScoped<IPatientRepository, PatientRepository>();

// NEW: Register AssessmentRepository and DatabaseSettings
builder.Services.AddScoped<IAssessmentRepository, AssessmentRepository>();
builder.Services.AddScoped<IDataImportRepository, DataImportRepository>();
builder.Services.Configure<DatabaseSettings>(options =>
{
    options.ConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
    options.DatabaseType = "SqlServer";
    options.CommandTimeout = 30;
    options.EnableRetry = true;
    options.MaxRetryAttempts = 3;
});

// Register services with interfaces (Clean Architecture pattern)
builder.Services.AddScoped<IPatientService, PatientService>();

// DecisionTreeService needs a file path (used by AssessmentController)
builder.Services.AddScoped<IDecisionTreeService>(provider =>
{
    var env = provider.GetRequiredService<IWebHostEnvironment>();
    var filePath = Path.Combine(env.ContentRootPath, "data", "decisionTree.json");
    return new DecisionTreeService(filePath);
});

// AssessmentService now depends on IDecisionTreeService AND IAssessmentRepository
builder.Services.AddScoped<IAssessmentService, AssessmentService>();

builder.Services.AddScoped<IDataImportService, DataImportService>();

// FirstAppointment services
builder.Services.AddScoped<IFirstAppointmentRepository, FirstAppointmentRepository>();
builder.Services.AddScoped<IFirstAppointmentService, FirstAppointmentService>();

// CORS policy for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins("http://localhost:5173",  // Local development
                "https://gentle-plant-0e3550410-preview.centralus.2.azurestaticapps.net"  // Production
            ) // Your React app URL
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 52428800; // 50MB
});
builder.Services.Configure<FormOptions>(options =>
{
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartBodyLengthLimit = int.MaxValue;
    options.MultipartHeadersLengthLimit = int.MaxValue;
});
// Add Swagger/OpenAPI for development
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Use middleware
app.UseHttpsRedirection();

app.UseCors("AllowReact"); // Must be above UseAuthorization

app.UseAuthorization();

app.MapControllers();

app.Run();
