package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"syscall"
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
	meHandler := handler.NewMeHandler(authClient)
	roleTestHandler := handler.NewRoleTestHandler()
	academicHandler := handler.NewAcademicHandler(academicClient, notificationClient)
	fileHandler := handler.NewFileHandler(fileClient, academicClient)
	authMiddleware := middleware.NewAuthMiddleware(authClient)
	notificationHandler := handler.NewNotificationHandler(notificationClient)
	reportingHandler := handler.NewReportingHandler(reportingClient)
	supervisorHandler := handler.NewSupervisorHandler(academicClient)
	adminHandler := handler.NewAdminHandler(authClient, academicClient)
	auditHandler := handler.NewAuditHandler(authClient, academicClient)
	announcementHandler := handler.NewAnnouncementHandler(academicClient)
	academicYearHandler := handler.NewAcademicYearHandler(academicClient)
	scopeHandler := handler.NewScopeHandler(academicClient)
	commentHandler := handler.NewCommentHandler(academicClient)
	bulkVerifyHandler := handler.NewBulkVerifyHandler(academicClient)

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

	mux.Handle(
		"/api/v1/me/change-password",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(http.HandlerFunc(meHandler.ChangePassword)),
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

	// ─── Admin: User & Data Master Management (Epic 2) ─────────────────────

	registerAdmin := func(path string, handlerFn http.HandlerFunc, roles ...string) {
		mux.Handle(
			path,
			middleware.RateLimitMiddleware(authenticatedRateLimiter)(
				authMiddleware.RequireAuth(
					authMiddleware.RequireRole(roles...)(handlerFn),
				),
			),
		)
	}

	registerAdmin("/api/v1/admin/users", adminHandler.ListUsers, "SUPER_ADMIN", "ADMIN_PRODI")
	registerAdmin("/api/v1/admin/users/create", adminHandler.CreateUser, "SUPER_ADMIN")
	registerAdmin("/api/v1/admin/users/update", adminHandler.UpdateUser, "SUPER_ADMIN")
	registerAdmin("/api/v1/admin/users/status", adminHandler.SetUserStatus, "SUPER_ADMIN")
	registerAdmin("/api/v1/admin/users/role", adminHandler.AssignUserRole, "SUPER_ADMIN")

	registerAdmin("/api/v1/admin/departments", adminHandler.ListDepartments, "SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI")
	registerAdmin("/api/v1/admin/departments/create", adminHandler.CreateDepartment, "SUPER_ADMIN")
	registerAdmin("/api/v1/admin/departments/update", adminHandler.UpdateDepartment, "SUPER_ADMIN")

	registerAdmin("/api/v1/admin/students", adminHandler.ListStudents, "SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI")
	registerAdmin("/api/v1/admin/students/upsert", adminHandler.UpsertStudent, "SUPER_ADMIN", "ADMIN_PRODI")
	registerAdmin("/api/v1/admin/students/status", adminHandler.SetStudentStatus, "SUPER_ADMIN", "ADMIN_PRODI")

	registerAdmin("/api/v1/admin/lecturers", adminHandler.ListAllLecturers, "SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI")
	registerAdmin("/api/v1/admin/lecturers/upsert", adminHandler.UpsertLecturer, "SUPER_ADMIN", "ADMIN_PRODI")
	registerAdmin("/api/v1/admin/lecturers/status", adminHandler.SetLecturerStatus, "SUPER_ADMIN", "ADMIN_PRODI")

	// Audit log aggregator (Epic 4) — SUPER_ADMIN only.
	registerAdmin("/api/v1/admin/audit-logs", auditHandler.ListAuditLogs, "SUPER_ADMIN")

	// Announcements (FR-252).
	mux.Handle(
		"/api/v1/announcements",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(http.HandlerFunc(announcementHandler.List)),
		),
	)
	registerAdmin("/api/v1/admin/announcements/create", announcementHandler.Create,
		"SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI")
	registerAdmin("/api/v1/admin/announcements/update", announcementHandler.Update,
		"SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI")
	registerAdmin("/api/v1/admin/announcements/deactivate", announcementHandler.Deactivate,
		"SUPER_ADMIN", "ADMIN_PRODI", "KAPRODI")

	// Academic years (Epic 10a / FR-278) — read for everyone authenticated,
	// write only Super Admin.
	mux.Handle(
		"/api/v1/academic-years",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(http.HandlerFunc(academicYearHandler.List)),
		),
	)
	mux.Handle(
		"/api/v1/academic-years/active",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(http.HandlerFunc(academicYearHandler.GetActive)),
		),
	)
	registerAdmin("/api/v1/admin/academic-years/create", academicYearHandler.Create, "SUPER_ADMIN")
	registerAdmin("/api/v1/admin/academic-years/set-active", academicYearHandler.SetActive, "SUPER_ADMIN")

	// User department scopes (Epic 10a / FR-277).
	registerAdmin("/api/v1/admin/users/scope", scopeHandler.GetUserScope, "SUPER_ADMIN")
	registerAdmin("/api/v1/admin/users/scope/set", scopeHandler.SetUserScope, "SUPER_ADMIN")

	// Request comments (Epic 10b / FR-260).
	mux.Handle(
		"/api/v1/request-comments",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(http.HandlerFunc(commentHandler.List)),
		),
	)
	mux.Handle(
		"/api/v1/request-comments/create",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(http.HandlerFunc(commentHandler.Create)),
		),
	)

	// Bulk verify academic requests (Epic 10b / FR-255).
	registerAdmin("/api/v1/admin/academic-requests/bulk-verify",
		bulkVerifyHandler.BulkVerifyAcademic, "SUPER_ADMIN", "ADMIN_PRODI")

	// Lecturer workload report (Epic 4).
	mux.Handle(
		"/api/v1/reports/lecturer-workload",
		middleware.RateLimitMiddleware(authenticatedRateLimiter)(
			authMiddleware.RequireAuth(
				authMiddleware.RequireRole("SUPER_ADMIN", "KAPRODI", "ADMIN_PRODI")(
					http.HandlerFunc(reportingHandler.GetLecturerWorkload),
				),
			),
		),
	)

	fmt.Println("API Gateway running on port 8080")
	fmt.Println("Auth Service target: localhost:50051")

	// Apply middleware chain: Request ID -> Security Headers -> CORS -> Rate Limiting -> Main Handler
	handlerWithSecurity := middleware.SecurityHeadersMiddleware(mux)
	handlerWithCORS := middleware.CORSMiddleware(handlerWithSecurity)
	handlerWithRequestID := middleware.RequestIDMiddleware(handlerWithCORS)
	handlerWithLogging := middleware.LoggingMiddleware(handlerWithRequestID)

	rootCtx, cancelRoot := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancelRoot()

	srv := &http.Server{
		Addr:              ":8080",
		Handler:           handlerWithLogging,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("api-gateway: %v", err)
		}
	}()

	<-rootCtx.Done()
	log.Println("API Gateway: shutdown signal received, draining...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("API Gateway: forced shutdown: %v", err)
	} else {
		log.Println("API Gateway: drained cleanly")
	}
}
