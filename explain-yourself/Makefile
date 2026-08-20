# Explain Yourself
#
# Everything here runs on a Mac with Xcode 16+. The one exception is
# `make test-kit`, which only needs a Swift toolchain and will run on Linux CI.

SCHEME      := ExplainYourself
PROJECT     := ExplainYourself.xcodeproj
DESTINATION := 'platform=iOS Simulator,name=iPhone 16'

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.PHONY: setup
setup: ## Create Secrets.xcconfig from the example (safe to re-run)
	@test -f ExplainYourself/Config/xcconfig/Secrets.xcconfig \
		|| cp ExplainYourself/Config/xcconfig/Secrets.example.xcconfig \
		      ExplainYourself/Config/xcconfig/Secrets.xcconfig
	@echo "Secrets.xcconfig is ready (and git-ignored). Fill it in, or leave it"
	@echo "as-is to run the app in demo mode with no backend."

.PHONY: build
build: ## Build the app for the simulator
	xcodebuild build -project $(PROJECT) -scheme $(SCHEME) -destination $(DESTINATION)

.PHONY: test
test: ## Run every test (domain package + app)
	xcodebuild test -project $(PROJECT) -scheme $(SCHEME) -destination $(DESTINATION)

.PHONY: test-kit
test-kit: ## Run the domain tests only — no simulator, works on Linux CI
	swift test --package-path Packages/ExplainYourselfKit

.PHONY: regenerate
regenerate: ## Rebuild the .xcodeproj from project.yml (needs xcodegen)
	xcodegen generate

.PHONY: db-reset
db-reset: ## Reset the local Supabase database and re-apply every migration
	supabase db reset

.PHONY: db-push
db-push: ## Apply migrations to the linked remote project
	supabase db push

.PHONY: functions
functions: ## Deploy the edge functions
	supabase functions deploy session
	supabase functions deploy flavour
	supabase functions deploy cleanup --no-verify-jwt

.PHONY: secret-scan
secret-scan: ## Fail if anything that looks like a real credential is committed
	@echo "Scanning tracked files for credentials…"
	@! git ls-files -z | xargs -0 grep -lE \
		'(service_role|SUPABASE_SERVICE_ROLE_KEY=[A-Za-z0-9._-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-ant-[A-Za-z0-9-]{20,}|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,})' \
		2>/dev/null \
		|| (echo "Found something that looks like a credential. Do not commit it." && exit 1)
	@echo "Clean."
