import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServer()
    const { id } = await params
    const { data, error } = await supabase
      .from('course')
      .select(`
        id,
        institutions_id,
        regulation_id,
        offering_department_id,
        institution_code,
        regulation_code,
        offering_department_code,
        course_code,
        course_name,
        course_category,
        course_type,
        course_part_master,
        credit,
        split_credit,
        theory_credit,
        practical_credit,
        qp_code,
        e_code_name,
        duration_hours,
        evaluation_type,
        result_type,
        self_study_course,
        outside_class_course,
        open_book,
        online_course,
        dummy_number_not_required,
        annual_course,
        multiple_qp_set,
        no_of_qp_setter,
        no_of_scrutinizer,
        fee_exception,
        syllabus_pdf_url,
        description,
        status,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    const mapped = data ? {
      id: data.id,
      institutions_id: data.institutions_id,
      regulation_id: data.regulation_id,
      offering_department_id: data.offering_department_id,
      institution_code: data.institution_code,
      regulation_code: data.regulation_code,
      offering_department_code: data.offering_department_code,
      course_code: data.course_code,
      course_title: data.course_name,
      course_category: data.course_category,
      course_type: data.course_type,
      course_part_master: data.course_part_master,
      credits: data.credit,
      split_credit: data.split_credit,
      theory_credit: data.theory_credit,
      practical_credit: data.practical_credit,
      qp_code: data.qp_code,
      e_code_name: data.e_code_name,
      duration_hours: data.duration_hours,
      evaluation_type: data.evaluation_type,
      result_type: data.result_type,
      self_study_course: data.self_study_course,
      outside_class_course: data.outside_class_course,
      open_book: data.open_book,
      online_course: data.online_course,
      dummy_number_required: data.dummy_number_not_required,
      annual_course: data.annual_course,
      multiple_qp_set: data.multiple_qp_set,
      no_of_qp_setter: data.no_of_qp_setter,
      no_of_scrutinizer: data.no_of_scrutinizer,
      fee_exception: data.fee_exception,
      syllabus_pdf_url: data.syllabus_pdf_url,
      description: data.description,
      is_active: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } : null
    return NextResponse.json(mapped)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServer()
    const { id } = await params
    const body = await req.json()
    const input = body as Record<string, unknown>
    const data: Record<string, unknown> = {
      ...(input.institutions_id !== undefined && { institutions_id: input.institutions_id }),
      ...(input.regulation_id !== undefined && { regulation_id: input.regulation_id }),
      ...(input.offering_department_id !== undefined && { offering_department_id: input.offering_department_id }),
      ...(input.institution_code !== undefined && { institution_code: String(input.institution_code) }),
      ...(input.regulation_code !== undefined && { regulation_code: String(input.regulation_code) }),
      ...(input.offering_department_code !== undefined && { offering_department_code: String(input.offering_department_code) }),
      ...(input.course_code !== undefined && { course_code: String(input.course_code) }),
      ...(input.course_title !== undefined && { course_name: String(input.course_title) }),
      ...(input.course_category !== undefined && { course_category: String(input.course_category) }),
      ...(input.course_type !== undefined && { course_type: String(input.course_type) }),
      ...(input.course_part_master !== undefined && { course_part_master: String(input.course_part_master) }),
      ...(input.credits !== undefined && { credit: Number(input.credits) }),
      ...(input.split_credit !== undefined && { split_credit: Boolean(input.split_credit) }),
      ...(input.theory_credit !== undefined && { theory_credit: Number(input.theory_credit) }),
      ...(input.practical_credit !== undefined && { practical_credit: Number(input.practical_credit) }),
      ...(input.qp_code !== undefined && { qp_code: String(input.qp_code) }),
      ...(input.e_code_name && { e_code_name: String(input.e_code_name) }),
      ...(input.duration_hours !== undefined && { duration_hours: Number(input.duration_hours) }),
      ...(input.evaluation_type !== undefined && { evaluation_type: String(input.evaluation_type) }),
      ...(input.result_type !== undefined && { result_type: String(input.result_type) }),
      ...(input.self_study_course !== undefined && { self_study_course: Boolean(input.self_study_course) }),
      ...(input.outside_class_course !== undefined && { outside_class_course: Boolean(input.outside_class_course) }),
      ...(input.open_book !== undefined && { open_book: Boolean(input.open_book) }),
      ...(input.online_course !== undefined && { online_course: Boolean(input.online_course) }),
      ...(input.dummy_number_required !== undefined && { dummy_number_not_required: Boolean(input.dummy_number_required) }),
      ...(input.annual_course !== undefined && { annual_course: Boolean(input.annual_course) }),
      ...(input.multiple_qp_set !== undefined && { multiple_qp_set: Boolean(input.multiple_qp_set) }),
      ...(input.no_of_qp_setter !== undefined && { no_of_qp_setter: Number(input.no_of_qp_setter) }),
      ...(input.no_of_scrutinizer !== undefined && { no_of_scrutinizer: Number(input.no_of_scrutinizer) }),
      ...(input.fee_exception !== undefined && { fee_exception: Boolean(input.fee_exception) }),
      ...(input.syllabus_pdf_url !== undefined && { syllabus_pdf_url: String(input.syllabus_pdf_url) }),
      ...(input.description !== undefined && { description: String(input.description) }),
      ...(input.is_active !== undefined && { status: Boolean(input.is_active) }),
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await supabase
      .from('course')
      .update({
        ...data,
        ...(input.display_code !== undefined && { display_code: input.display_code ? String(input.display_code) : null }),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      throw error
    }
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to update course', details: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServer()
    const { id } = await params
    const { error } = await supabase.from('course').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}
