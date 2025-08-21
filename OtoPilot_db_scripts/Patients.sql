
CREATE TABLE [dbo].[Patients](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[FullName] [nvarchar](200) NOT NULL,
	[Gender] [nvarchar](50) NOT NULL,
	[Age] [int] NOT NULL,
	[Address] [nvarchar](500) NOT NULL,
	[Phone] [nvarchar](50) NOT NULL,
	[Email] [nvarchar](255) NOT NULL,
	[LastVisit] [nvarchar](100) NOT NULL,
	[CreatedDate] [datetime2](7) NULL,
	[UpdatedDate] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Patients] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO

ALTER TABLE [dbo].[Patients] ADD  DEFAULT (getdate()) FOR [UpdatedDate]
GO


