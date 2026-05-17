package main

import (
	"fmt"
	"net/http"
	"time"

	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/handler"
	"campus-flow/apps/services/api-gateway/internal/middleware"
)

func main() {
	authClient := client.NewAuthClient("127.0.0.1:50051")
	defer authClient.Close()

	academicClient := client.NewAcademicClient("127.0.0.1:50052")
	defer academicClient.Close()

	fileClient := client.NewFileClient("127.0.0.1:50053")
	defer fileClient.Close()

	notificationClient := client.NewNotificationClient("127.0.0.1:50054")
	defer notificationClient.Close()

	reportingClient := client.NewReportingClient("127.0.0.1:50055")
	defer reportingClient.Close()

	authHandler := handler.NewAuthHandler(authClient)
	meHandler := handler.NewMeHandler()
	roleTestHandler := handler.NewRoleTestHandler()
	academicHandler := handler.NewAcademicHandler(academicClient, notificationClient)
	fileHandler := handler.NewFileHandler(fileClient, academicClient)
	authMiddleware := middleware.NewAuthMiddleware(authClient)
	notificationHandler := handler.NewNotificationHandler(notificationClient)
	reportingHandler := handler.NewReportingHandler(reportingClient)
	supervisorHandler := handler.NewSupervisorHandler(academicClient)

	// Rate limiter: 100 requests per minute for public endpoints, 300 for authenticated
	publicRateLimiter := middleware.NewRateLimiter(100, time.Minute)
	authenticatedRateLimiter := middleware.NewRateLimiter(300, time.Minute)

	mux := http.NewServeMux()

	mux.HandleFunc(
		"/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("api-gateway healthy"))
		},
	)

	// Public auth routes (rate limited)
	mux.Handle(
		"/api/v1/auth/register",
		middleware.RateLimitMiddleware(publicRateLimiter)(
			http.HandlerFunc(authHandler.Register),
		),
	)
	mux.Handle(
		"/api/v1/auth/login",
		middleware.RateLimitMiddleware(publicRateLimiter)(
			http.HandlerFunc(authHandler.Login),
		),
	)
	mux.Handle(
		"/api/v1/auth/refresh",
		middleware.RateLimitMiddleware(publicRateLimiter)(
			http.HandlerFunc(authHandler.RefreshToken),
		),
	)
	mux.Handle(
		"/api/v1/auth/validate",
		middleware.RateLimitMiddleware(publicRateLimiter)(
			http.HandlerFunc(authHandler.ValidateToken),
		),
	)
	mux.Handle(
		"/api/v1/auth/logout",
		middleware.RateLimitMiddleware(publicRateLimiter)(
			http.HandlerFunc(authHandler.Logout),
		),
	)

	// Protected routes (rate limited + authenticated)
	mux.Handle(
		"/api/v1/me",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(http.HandlerFunc(meHandler.GetMe)),
		),
	)

	// Protected role-based test routes
	mux.Handle(
		"/api/v1/student/test",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("MAHASISWA")(
					http.HandlerFunc(roleTestHandler.StudentOnly),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/admin/test",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("SUPER_ADMIN", "ADMIN_PRODI")(
					http.HandlerFunc(roleTestHandler.AdminOnly),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/head/test",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("KAPRODI")(
					http.HandlerFunc(roleTestHandler.HeadOnly),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/academic-services",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				http.HandlerFunc(academicHandler.ListAcademicServices),
			),
		),
	)

	mux.Handle(
		"/api/v1/admin/academic-requests",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("ADMIN_PRODI", "KAPRODI", "TATA_USAHA", "SUPER_ADMIN")(
					http.HandlerFunc(academicHandler.ListAllAcademicRequests),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/student/academic-requests",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("MAHASISWA")(
					http.HandlerFunc(academicHandler.StudentAcademicRequests),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/admin/academic-requests/verify",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("ADMIN_PRODI", "SUPER_ADMIN")(
					http.HandlerFunc(academicHandler.VerifyAcademicRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/admin/academic-requests/request-revision",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("ADMIN_PRODI", "SUPER_ADMIN")(
					http.HandlerFunc(academicHandler.RequestRevisionAcademicRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/student/academic-requests/submit",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("MAHASISWA")(
					http.HandlerFunc(academicHandler.SubmitAcademicRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/student/academic-requests/update",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("MAHASISWA")(
					http.HandlerFunc(academicHandler.UpdateAcademicRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/head/academic-requests/approve",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("KAPRODI", "SUPER_ADMIN")(
					http.HandlerFunc(academicHandler.ApproveAcademicRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/head/academic-requests/reject",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("KAPRODI", "SUPER_ADMIN")(
					http.HandlerFunc(academicHandler.RejectAcademicRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/staff/academic-requests/complete",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("TATA_USAHA", "SUPER_ADMIN")(
					http.HandlerFunc(academicHandler.CompleteAcademicRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/student/academic-requests/cancel",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("MAHASISWA")(
					http.HandlerFunc(academicHandler.CancelAcademicRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/student/academic-requests/upload-supporting-document",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("MAHASISWA")(
					http.HandlerFunc(fileHandler.UploadAcademicSupportingDocument),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/staff/academic-requests/upload-final-document",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("TATA_USAHA", "SUPER_ADMIN")(
					http.HandlerFunc(fileHandler.UploadAcademicFinalDocument),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/academic-requests/files",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				http.HandlerFunc(fileHandler.ListAcademicRequestFiles),
			),
		),
	)

	// BE-02-04: GET /api/v1/academic-requests/{id}
	// BE-02-02: GET /api/v1/academic-requests/{id}/history
	// Must be registered AFTER specific sub-paths like /files to avoid conflicts
	mux.Handle(
		"/api/v1/academic-requests/",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				http.HandlerFunc(academicHandler.RouteAcademicRequestByID),
			),
		),
	)

	mux.Handle(
		"/api/v1/files/download",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				http.HandlerFunc(fileHandler.DownloadFile),
			),
		),
	)

	mux.Handle(
		"/api/v1/notifications",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				http.HandlerFunc(notificationHandler.ListMyNotifications),
			),
		),
	)

	mux.Handle(
		"/api/v1/notifications/read",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				http.HandlerFunc(notificationHandler.MarkNotificationAsRead),
			),
		),
	)

	mux.Handle(
		"/api/v1/notifications/read-all",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				http.HandlerFunc(notificationHandler.MarkAllNotificationsAsRead),
			),
		),
	)

	mux.Handle(
		"/api/v1/reports/academic-requests",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI", "TATA_USAHA")(
					http.HandlerFunc(reportingHandler.GetAcademicDashboard),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/lecturers",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				http.HandlerFunc(supervisorHandler.ListLecturers),
			),
		),
	)

	mux.Handle(
		"/api/v1/student/supervisor-requests",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("MAHASISWA")(
					http.HandlerFunc(supervisorHandler.StudentSupervisorRequests),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/admin/supervisor-requests",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("ADMIN_PRODI", "KAPRODI", "SUPER_ADMIN")(
					http.HandlerFunc(supervisorHandler.ListAllSupervisorRequests),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/admin/supervisor-requests/verify",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("ADMIN_PRODI", "SUPER_ADMIN")(
					http.HandlerFunc(supervisorHandler.VerifySupervisorRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/admin/supervisor-requests/request-revision",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("ADMIN_PRODI", "SUPER_ADMIN")(
					http.HandlerFunc(supervisorHandler.RequestRevisionSupervisorRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/head/supervisor-requests/assign",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("KAPRODI", "SUPER_ADMIN")(
					http.HandlerFunc(supervisorHandler.AssignSupervisor),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/lecturer/supervisor-requests",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("DOSEN")(
					http.HandlerFunc(supervisorHandler.ListLecturerSupervisorRequests),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/lecturer/supervisor-requests/accept",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("DOSEN")(
					http.HandlerFunc(supervisorHandler.AcceptSupervisorRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/lecturer/supervisor-requests/reject",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("DOSEN")(
					http.HandlerFunc(supervisorHandler.RejectSupervisorRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/student/supervisor-requests/cancel",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("MAHASISWA")(
					http.HandlerFunc(supervisorHandler.CancelSupervisorRequest),
				),
			),
		),
	)

	mux.Handle(
		"/api/v1/reports/supervisor-requests",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI", "TATA_USAHA")(
					http.HandlerFunc(reportingHandler.GetSupervisorDashboard),
				),
			),
		),
	)

	fmt.Println("API Gateway running on port 8080")
	fmt.Println("Auth Service target: localhost:50051")

	// Apply middleware chain: Security Headers -> CORS -> Rate Limiting -> Main Handler
	handlerWithSecurity := middleware.SecurityHeadersMiddleware(mux)
	handlerWithCORS := middleware.CORSMiddleware(handlerWithSecurity)

	if err := http.ListenAndServe(":8080", handlerWithCORS); err != nil {
		panic(err)
	}
}
