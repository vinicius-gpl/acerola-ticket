package wails

import (
	"context"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/modules/metrics"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func EmitSnapshot(ctx context.Context, snapshot metrics.Snapshot) {
	runtime.EventsEmit(ctx, "metrics:snapshot", snapshot)
}
func EmitViewChange(ctx context.Context, view string) {
	runtime.EventsEmit(ctx, "view:change", view)
}
func EmitWindowShown(ctx context.Context, view string) {
	runtime.EventsEmit(ctx, "window:shown", view)
}
