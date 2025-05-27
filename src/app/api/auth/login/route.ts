import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas/auth";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
        const errorMessage = parseResult.error.errors[0].message;
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 400 },
        );
    }

    const { email, password } = parseResult.data;
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 401 },
        );
    }

    return NextResponse.json(
        { success: true },
        { status: 200 },
    );
}
