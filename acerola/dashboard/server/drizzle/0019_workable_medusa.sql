ALTER TABLE "ticket_histories" DROP CONSTRAINT "ticket_histories_ticket_id_tickets_id_fk";
--> statement-breakpoint
ALTER TABLE "ticket_service_orders" DROP CONSTRAINT "ticket_service_orders_ticket_id_tickets_id_fk";
--> statement-breakpoint
ALTER TABLE "ticket_histories" ADD CONSTRAINT "ticket_histories_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_service_orders" ADD CONSTRAINT "ticket_service_orders_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE no action;