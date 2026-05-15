package main

import (
	"fmt"
	"net/http"
	
	"campus-flow/apps/services/api-gateway/internal/client"
	"campus-flow/apps/services/api-gateway/internal/handler"
	"campus-flow/apps/services/api-gateway/internal/middleware"
)

func main() {
	authClient := client.NewAuthClient("localhost:50051")
	defer authClient.Close()
	
	academicClient := client.NewAcademicClient("localhost:50052")
	defer academicClient.Close()
	
	fileClient := client.NewFileClient("localhost:50053")
	defer fileClient.Close()
	
	notificationClient := client.NewNotificationClient("localhost:50054")
	defer notificationClient.Close()
	
	reportingClient := client.NewReportingClient("localhost:50055")
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
	
	mux := http.NewServeMux()
	
	mux.HandleFunc(
		"/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("api-gateway healthy"))
		},
	)
	
	// Public auth routes
	mux.HandleFunc("/api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("/api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("/api/v1/auth/refresh", authHandler.RefreshToken)
	mux.HandleFunc("/api/v1/auth/validate", authHandler.ValidateToken)
	mux.HandleFunc("/api/v1/auth/logout", authHandler.Logout)
	
	// Protected route
	mux.Handle(
		"/api/v1/me",
		authMiddleware.RequireAuth(http.HandlerFunc(meHandler.GetMe)),
	)
	
	// Protected role-based test routes
	mux.Handle(
		"/api/v1/student/test",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("MAHASISWA")(
				http.HandlerFunc(roleTestHandler.StudentOnly),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/admin/test",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("SUPER_ADMIN", "ADMIN_PRODI")(
				http.HandlerFunc(roleTestHandler.AdminOnly),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/head/test",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("KAPRODI")(
				http.HandlerFunc(roleTestHandler.HeadOnly),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/academic-services",
		authMiddleware.RequireAuth(
			http.HandlerFunc(academicHandler.ListAcademicServices),
		),
	)
	
	mux.Handle(
		"/api/v1/student/academic-requests",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("MAHASISWA")(
				http.HandlerFunc(academicHandler.StudentAcademicRequests),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/admin/academic-requests/verify",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("ADMIN_PRODI", "SUPER_ADMIN")(
				http.HandlerFunc(academicHandler.VerifyAcademicRequest),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/head/academic-requests/approve",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("KAPRODI", "SUPER_ADMIN")(
				http.HandlerFunc(academicHandler.ApproveAcademicRequest),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/head/academic-requests/reject",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("KAPRODI", "SUPER_ADMIN")(
				http.HandlerFunc(academicHandler.RejectAcademicRequest),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/staff/academic-requests/complete",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("TATA_USAHA", "SUPER_ADMIN")(
				http.HandlerFunc(academicHandler.CompleteAcademicRequest),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/student/academic-requests/upload-supporting-document",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("MAHASISWA")(
				http.HandlerFunc(fileHandler.UploadAcademicSupportingDocument),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/staff/academic-requests/upload-final-document",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("TATA_USAHA", "SUPER_ADMIN")(
				http.HandlerFunc(fileHandler.UploadAcademicFinalDocument),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/academic-requests/files",
		authMiddleware.RequireAuth(
			http.HandlerFunc(fileHandler.ListAcademicRequestFiles),
		),
	)
	
	mux.Handle(
		"/api/v1/files/download",
		authMiddleware.RequireAuth(
			http.HandlerFunc(fileHandler.DownloadFile),
		),
	)
	
	mux.Handle(
		"/api/v1/notifications",
		authMiddleware.RequireAuth(
			http.HandlerFunc(notificationHandler.ListMyNotifications),
		),
	)
	
	mux.Handle(
		"/api/v1/notifications/read",
		authMiddleware.RequireAuth(
			http.HandlerFunc(notificationHandler.MarkNotificationAsRead),
		),
	)
	
	mux.Handle(
		"/api/v1/reports/academic-requests",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI", "TATA_USAHA")(
				http.HandlerFunc(reportingHandler.GetAcademicDashboard),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/lecturers",
		authMiddleware.RequireAuth(
			http.HandlerFunc(supervisorHandler.ListLecturers),
		),
	)
	
	mux.Handle(
		"/api/v1/student/supervisor-requests",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("MAHASISWA")(
				http.HandlerFunc(supervisorHandler.StudentSupervisorRequests),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/admin/supervisor-requests/verify",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("ADMIN_PRODI", "SUPER_ADMIN")(
				http.HandlerFunc(supervisorHandler.VerifySupervisorRequest),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/head/supervisor-requests/assign",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("KAPRODI", "SUPER_ADMIN")(
				http.HandlerFunc(supervisorHandler.AssignSupervisor),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/lecturer/supervisor-requests",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("DOSEN")(
				http.HandlerFunc(supervisorHandler.ListLecturerSupervisorRequests),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/lecturer/supervisor-requests/accept",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("DOSEN")(
				http.HandlerFunc(supervisorHandler.AcceptSupervisorRequest),
			),
		),
	)
	
	mux.Handle(
		"/api/v1/lecturer/supervisor-requests/reject",
		authMiddleware.RequireAuth(
			authMiddleware.RequireRole("DOSEN")(
				http.HandlerFunc(supervisorHandler.RejectSupervisorRequest),
			),
		),
	)
	
	fmt.Println("API Gateway running on port 8080")
	fmt.Println("Auth Service target: localhost:50051")
	
	if err := http.ListenAndServe(":8080", mux); err != nil {
		panic(err)
	}
}
