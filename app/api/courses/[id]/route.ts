import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServer()
    const { id } = await params
    const { data, error } = await supabase
      .from('courses')
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
        display_code,
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
      display_code: data.display_code,
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
      updated_at: new Date().toISOString(),
    }

    // Resolve foreign keys if codes are provided
    if (input.institution_code !== undefined) {
      const { data: institutionData, error: institutionError } = await supabase
        .from('institutions')
        .select('id')
        .eq('institution_code', String(input.institution_code))
        .single()

      if (institutionError || !institutionData) {
        return NextResponse.json({
          error: `Institution with code "${input.institution_code}" not found.`
        }, { status: 400 })
      }

      data.institutions_id = institutionData.id
      data.institution_code = String(input.institution_code)
    }

    if (input.regulation_code !== undefined) {
      const { data: regulationData, error: regulationError } = await supabase
        .from('regulations')
        .select('id')
        .eq('regulation_code', String(input.regulation_code))
        .single()

      if (regulationError || !regulationData) {
        return NextResponse.json({
          error: `Regulation with code "${input.regulation_code}" not found.`
        }, { status: 400 })
      }

      data.regulation_id = regulationData.id
      data.regulation_code = String(input.regulation_code)
    }

    if (input.offering_department_code !== undefined && input.offering_department_code) {
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('department_code', String(input.offering_department_code))
        .single()

      if (deptError || !deptData) {
        return NextResponse.json({
          error: `Department with code "${input.offering_department_code}" not found.`
        }, { status: 400 })
      }

      data.offering_department_id = deptData.id
      data.offering_department_code = String(input.offering_department_code)
    }

    // Add all other fields
    if (input.course_code !== undefined) data.course_code = String(input.course_code)
    if (input.course_title !== undefined) data.course_name = String(input.course_title)
    if (input.display_code !== undefined) data.display_code = input.display_code ? String(input.display_code) : null
    if (input.course_category !== undefined) data.course_category = String(input.course_category)
    if (input.course_type !== undefined) data.course_type = String(input.course_type)
    if (input.course_part_master !== undefined) data.course_part_master = String(input.course_part_master)
    if (input.credits !== undefined) data.credit = Number(input.credits)
    if (input.split_credit !== undefined) data.split_credit = Boolean(input.split_credit)
    if (input.theory_credit !== undefined) data.theory_credit = Number(input.theory_credit)
    if (input.practical_credit !== undefined) data.practical_credit = Number(input.practical_credit)
    if (input.qp_code !== undefined) data.qp_code = String(input.qp_code)
    if (input.e_code_name !== undefined) data.e_code_name = String(input.e_code_name)
    if (input.duration_hours !== undefined) data.duration_hours = Number(input.duration_hours)
    if (input.evaluation_type !== undefined) data.evaluation_type = String(input.evaluation_type)
    if (input.result_type !== undefined) data.result_type = String(input.result_type)
    if (input.self_study_course !== undefined) data.self_study_course = Boolean(input.self_study_course)
    if (input.outside_class_course !== undefined) data.outside_class_course = Boolean(input.outside_class_course)
    if (input.open_book !== undefined) data.open_book = Boolean(input.open_book)
    if (input.online_course !== undefined) data.online_course = Boolean(input.online_course)
    if (input.dummy_number_required !== undefined) data.dummy_number_not_required = Boolean(input.dummy_number_required)
    if (input.annual_course !== undefined) data.annual_course = Boolean(input.annual_course)
    if (input.multiple_qp_set !== undefined) data.multiple_qp_set = Boolean(input.multiple_qp_set)
    if (input.no_of_qp_setter !== undefined) data.no_of_qp_setter = Number(input.no_of_qp_setter)
    if (input.no_of_scrutinizer !== undefined) data.no_of_scrutinizer = Number(input.no_of_scrutinizer)
    if (input.fee_exception !== undefined) data.fee_exception = Boolean(input.fee_exception)
    if (input.syllabus_pdf_url !== undefined) data.syllabus_pdf_url = String(input.syllabus_pdf_url)
    if (input.description !== undefined) data.description = String(input.description)
    if (input.is_active !== undefined) data.status = Boolean(input.is_active)

    const { data: updated, error } = await supabase
      .from('courses')
      .update(data)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase update error:', error)

      // Handle foreign key constraint violation
      if (error.code === '23503') {
        return NextResponse.json({
          error: 'Foreign key constraint failed. Ensure institution, regulation, and department exist.'
        }, { status: 400 })
      }

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
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}
