package com.comunidadedevspace.imc

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.widget.Button
import com.google.android.material.textfield.TextInputEditText

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)


        // Recuperar os componentes EditText
        // Criar uma variavel e associar componente de UI<EditText>
        // Recuperar o botão da tela
        // Colocar ação no botão setOnClickListner
        // Recuperar o texto digitado pelo edtPeso

        val edtPeso = findViewById<TextInputEditText>(R.id.edtPeso)
        val edtAltura = findViewById<TextInputEditText>(R.id.edtAltura)

        val btn_Calcular = findViewById<Button>(R.id.btn_Calcular)
            btn_Calcular.setOnClickListener {
                val peso: Float = edtPeso.text.toString().toFloat()
                val altura: Float = edtAltura.text.toString().toFloat()

                val alturaQ2 = altura * altura
                val resultado = peso / alturaQ2

                println("Seu IMC é: " + resultado)

            }

    }
}